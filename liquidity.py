"""Reported daily Black Market history; missing days are unknown, never zero."""
import math
import time
from statistics import median
from datetime import datetime, timedelta, timezone
from threading import Lock

import httpx
from aodp_client import AodpFetchError, SERVER_HOSTS, reserve_request

_cache = {}
_lock = Lock()
CACHE_SECONDS = 900


def summarize_history(payload, item_ids, now=None):
    now = now or datetime.now(timezone.utc)
    end = now.date()
    start = end - timedelta(days=7)
    buckets = {}
    for row in payload:
        if not isinstance(row, dict) or row.get('location') not in ('Black Market', 'BlackMarket', '3003'):
            continue
        item_id, quality = row.get('item_id'), row.get('quality')
        if item_id not in item_ids or type(quality) is not int or not 1 <= quality <= 5:
            continue
        data = row.get('data')
        if not isinstance(data, list):
            continue
        days = buckets.setdefault((item_id, quality), {})
        for point in data:
            try:
                date = datetime.fromisoformat(point['timestamp'].replace('Z', '+00:00'))
                if date.tzinfo is not None:
                    date = date.astimezone(timezone.utc)
                day = date.date()
                count, price = point['item_count'], point['avg_price']
                if not start <= day < end or type(count) is not int or count < 0:
                    continue
                if type(price) not in (int, float) or not math.isfinite(price) or price < 0 or (count and not price):
                    continue
                # Repeated buckets from overlapping uploads must not double the volume.
                if day not in days or count > days[day][0]:
                    days[day] = (count, price)
            except (KeyError, TypeError, ValueError, AttributeError):
                continue
    result = []
    for item_id in item_ids:
        for quality in range(1, 6):
            days = buckets.get((item_id, quality), {})
            count = sum(p[0] for p in days.values())
            active = sum(p[0] > 0 for p in days.values())
            latest = max(days) if days else None
            adequate = len(days) >= 5 and latest >= end - timedelta(days=2)
            average = count / len(days) if days else None
            median_volume = median(p[0] for p in days.values()) if days else None
            # Divide reported volume by the full window for a conservative sizing
            # budget, without claiming missing days had zero sales.
            volume_floor = count / 7 if days else None
            liquid = bool(adequate and active >= 5 and volume_floor >= 10 and median_volume >= 10)
            quantity_limit = math.floor(min(volume_floor, median_volume) * 0.1) if liquid else 0
            prices = [p[1] for p in days.values() if p[0] > 0]
            mean = sum(prices) / len(prices) if prices else 0
            cv = (math.sqrt(sum((p - mean) ** 2 for p in prices) / len(prices)) / mean * 100
                  if len(prices) >= 2 and mean else None)
            result.append({'item_id': item_id, 'quality': quality,
                           'status': 'sufficient' if adequate else 'insufficient',
                           'reported_days': len(days), 'active_days': active,
                           'reported_units': count if days else None,
                           'units_per_reported_day': round(average, 2) if average is not None else None,
                           'weighted_price': round(sum(p[0]*p[1] for p in days.values())/count, 2) if count else None,
                           'price_cv_pct': round(cv, 2) if cv is not None else None,
                           'price_history': [{'date': day.isoformat(), 'avg_price': price, 'item_count': units}
                                             for day, (units, price) in sorted(days.items()) if units > 0],
                           'daily_sales': [{'date': (start + timedelta(days=i)).isoformat(),
                                            'item_count': days[start + timedelta(days=i)][0]
                                            if start + timedelta(days=i) in days else None}
                                           for i in range(7)],
                           'last_day': latest.isoformat() if latest else None,
                           'frequent': bool(adequate and active >= 5 and average >= 10)})
            result[-1].update(liquid=liquid, median_daily_units=median_volume,
                              reported_units_per_window_day=round(volume_floor, 2) if days else None,
                              suggested_qty_limit=quantity_limit)
    return {'window_start': start.isoformat(), 'window_end': (end-timedelta(days=1)).isoformat(),
            'fetched_at': now.isoformat(), 'items': result}


def fetch_liquidity(server, item_ids):
    with _lock:
        now = datetime.now(timezone.utc)
        day = now.date()
        missing = [i for i in item_ids if (server, i, day) not in _cache or
                   time.monotonic() - _cache[(server, i, day)][0] >= CACHE_SECONDS]
        if missing:
            reserve_request()
            try:
                response = httpx.get(f'https://{SERVER_HOSTS[server]}/api/v2/stats/history/{",".join(missing)}.json',
                                     params={'locations': 'BlackMarket', 'qualities': '1,2,3,4,5',
                                             'time-scale': 24, 'date': str(day-timedelta(days=7)), 'end_date': str(day)},
                                     headers={'Accept-Encoding': 'gzip'}, timeout=20)
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, list):
                    raise ValueError('Invalid history')
            except (httpx.HTTPError, ValueError) as exc:
                raise AodpFetchError('Não foi possível consultar o histórico do Black Market.') from exc
            summary = summarize_history(payload, missing, now)
            for item_id in missing:
                _cache[(server, item_id, day)] = (time.monotonic(), {
                    **summary, 'items': [row for row in summary['items'] if row['item_id'] == item_id]})
            while len(_cache) > 6500:
                _cache.pop(next(iter(_cache)))
        summaries = [_cache[(server, i, day)][1] for i in item_ids]
        return {**summaries[0], 'fetched_at': min(s['fetched_at'] for s in summaries),
                'items': [item for summary in summaries for item in summary['items']]}
