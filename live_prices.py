"""AODP public deduped orders. These are observations, not a complete order book.

Schema and location/price normalization verified against ao-data/albiondata-client
lib/market.go and albiondata-server-rails market_order_dedupe_service.rb.
The deduped subject already expresses UnitPriceSilver in silver (no /10000).
"""
import asyncio
import json
import time
from collections import OrderedDict
from datetime import datetime, timezone
from threading import RLock

import nats

PORTS = {'Americas': 4222, 'Europe': 34222}
LOCATIONS = {7: 'Thetford', 1002: 'Lymhurst', 2004: 'Bridgewatch',
             3003: 'Black Market', 3005: 'Caerleon', 3008: 'Martlock', 4002: 'FortSterling'}
RETENTION_SECONDS = 600
MAX_ORDERS = 50000  # per server; bounded even during a busy market session


def iso(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()


def timestamp(value):
    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return dt.replace(tzinfo=timezone.utc).timestamp() if dt.tzinfo is None else dt.timestamp()


class LivePrices:
    def __init__(self, item_ids, clock=time.time):
        self.item_ids = set(item_ids)
        self.clock = clock
        self.lock = RLock()
        self.orders = {server: OrderedDict() for server in PORTS}
        self.baseline = {server: {} for server in PORTS}
        self.states = {server: {'state': 'stopped', 'last_message': None,
                               'last_relevant': None, 'received': 0} for server in PORTS}
        self.tasks = []
        self.clients = {}

    def set_state(self, server, state):
        with self.lock:
            self.states[server]['state'] = state

    def ingest(self, server, payload):
        """Accept one deduped message, rejecting malformed/irrelevant data."""
        now = self.clock()
        with self.lock:
            self.states[server]['last_message'] = now
        try:
            order = json.loads(payload)
            if not isinstance(order, dict):
                return False
            item_id = order['ItemTypeId']
            quality, level = order['QualityLevel'], order['EnchantmentLevel']
            price, amount, order_id = order['UnitPriceSilver'], order['Amount'], order['Id']
            if any(type(v) is not int for v in [quality, level, price, amount, order_id]):
                return False
            if not 1 <= quality <= 5 or not 0 <= level <= 4 or not 0 < price <= 2**53 or amount < 0 or order_id <= 0:
                return False
            if item_id not in self.item_ids or int(item_id.partition('@')[2] or 0) != level:
                return False
            location = order['LocationId']
            if type(location) not in (str, int):
                return False
            city = LOCATIONS.get(int(location))
            side = order['AuctionType']
            if not city or side != ('request' if city == 'Black Market' else 'offer'):
                return False
            expires = timestamp(order['Expires'])
        except (ValueError, TypeError, KeyError, OverflowError):
            return False
        with self.lock:
            orders = self.orders[server]
            # A repeated ID updates/replaces its price and quantity, never adds stock.
            orders.pop(order_id, None)
            if amount and expires > now:
                orders[order_id] = {'item_id': item_id, 'quality': quality, 'city': city,
                                    'price': price, 'received_at': now, 'expires': expires}
            while len(orders) > MAX_ORDERS:
                orders.popitem(last=False)
            self.states[server]['last_relevant'] = now
            self.states[server]['received'] += 1
        return True

    def seed(self, server, rows):
        """Keep REST observations by item/city/quality, without renewing their age."""
        with self.lock:
            for row in rows:
                city = 'FortSterling' if row.get('city') == 'Fort Sterling' else row.get('city')
                if row.get('item_id') in self.item_ids and city in LOCATIONS.values():
                    key = row['item_id'], row['quality'], city
                    field = 'buy_price_max_date' if city == 'Black Market' else 'sell_price_min_date'
                    old = self.baseline[server].get(key)
                    try:
                        if old and timestamp(old[field]) > timestamp(row[field]):
                            continue
                    except (ValueError, TypeError, KeyError):
                        pass
                    self.baseline[server][key] = dict(row, city=city)

    def snapshot(self, server, item_ids, city=None, max_age_min=None):
        now = self.clock()
        wanted = set(item_ids)
        allowed_age = min(RETENTION_SECONDS, max_age_min * 60) if max_age_min is not None else RETENTION_SECONDS
        with self.lock:
            orders = self.orders[server]
            for key in list(orders):
                if now - orders[key]['received_at'] >= RETENTION_SECONDS or orders[key]['expires'] <= now:
                    del orders[key]
            rows = {key: dict(row) for key, row in self.baseline[server].items()
                    if key[0] in wanted and (city is None or key[2] in [city, 'Black Market'])}
            best = {}
            for order in orders.values():
                key = order['item_id'], order['quality'], order['city']
                if key[0] not in wanted or (city is not None and key[2] not in [city, 'Black Market']):
                    continue
                if now - order['received_at'] > allowed_age:
                    continue
                date_field = 'buy_price_max_date' if key[2] == 'Black Market' else 'sell_price_min_date'
                try:
                    if order['received_at'] <= timestamp(rows[key][date_field]):
                        continue
                except (ValueError, TypeError, KeyError):
                    pass
                previous = best.get(key)
                sign = -1 if key[2] == 'Black Market' else 1
                # The feed is not a full order book: prioritize the latest observation,
                # rather than retaining a better price from an older, possibly filled order.
                if previous is None or (-order['received_at'], order['price'] * sign) < (-previous['received_at'], previous['price'] * sign):
                    best[key] = order
            for key, order in best.items():
                field = 'buy_price_max' if key[2] == 'Black Market' else 'sell_price_min'
                row = rows.get(key, {'item_id': key[0], 'quality': key[1], 'city': key[2],
                                     'sell_price_min': 0, 'buy_price_max': 0})
                try:
                    baseline_time = timestamp(row[field + '_date'])
                except (ValueError, TypeError, KeyError):
                    baseline_time = 0
                if order['received_at'] > baseline_time:
                    row[field] = order['price']
                    row[field + '_date'] = iso(order['received_at'])
                    row[field + '_source'] = 'live'
                    rows[key] = row
            state = dict(self.states[server])
            state['retention_seconds'] = RETENTION_SECONDS
            return list(rows.values()), state

    async def start(self):
        if not self.tasks:
            self.tasks = [asyncio.create_task(self._run(server)) for server in PORTS]

    async def stop(self):
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()
        for server in PORTS:
            self.set_state(server, 'stopped')

    async def _run(self, server):
        delay = 2
        while True:
            client = nats.aio.client.Client()
            self.clients[server] = client
            try:
                self.set_state(server, 'connecting')
                async def error_cb(error):
                    self.set_state(server, 'reconnecting')
                async def disconnected_cb():
                    self.set_state(server, 'reconnecting')
                async def handler(msg):
                    self.ingest(server, msg.data)
                await client.connect(
                    servers=[f'nats://nats.albion-online-data.com:{PORTS[server]}'],
                    user='public', password='thenewalbiondata',
                    name='albion-flip-scanner', connect_timeout=5, allow_reconnect=False,
                    error_cb=error_cb, disconnected_cb=disconnected_cb,
                    ping_interval=20, max_outstanding_pings=2,
                )
                await client.subscribe('marketorders.deduped', cb=handler,
                                       pending_msgs_limit=8192, pending_bytes_limit=8 * 1024 * 1024)
                await client.flush(timeout=5)
                self.set_state(server, 'connected')
                delay = 2
                while client.is_connected:
                    await asyncio.sleep(1)
            except asyncio.CancelledError:
                raise
            except Exception:
                # No credentials or raw remote errors are sent to the browser/logs.
                self.set_state(server, 'reconnecting')
            finally:
                await client.close()
                self.clients.pop(server, None)
                self.set_state(server, 'stopped')
            self.set_state(server, 'reconnecting')
            await asyncio.sleep(delay)
            delay = min(delay * 2, 60)
