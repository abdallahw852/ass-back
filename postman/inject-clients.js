/* eslint-disable */
// One-shot script: adds the Clients folder to the Postman collection.
// Run: node postman/inject-clients.js
const fs = require('fs');
const path = require('path');

const colPath = path.join(__dirname, 'ASAS-OS.postman_collection.json');
const col = JSON.parse(fs.readFileSync(colPath, 'utf8'));

// Remove existing Clients folder to make the script idempotent
col.item = col.item.filter((i) => i.name !== 'Clients');

function item(name, description, method, url, queryParams, testScript, captureVar) {
  const query = (queryParams || []).map(([key, value, disabled]) => ({
    key,
    value,
    ...(disabled ? { disabled: true } : {}),
  }));

  const pathParts = url.replace('{{baseUrl}}/', '').split('/');

  const tests = testScript || [];
  if (captureVar) {
    tests.push(
      'if (pm.response.code === 200) {',
      '  const j = pm.response.json();',
      `  if (j.items && j.items.length > 0) pm.collectionVariables.set("${captureVar}", j.items[0].id);`,
      '}',
    );
  }

  return {
    name,
    description,
    event: [
      {
        listen: 'test',
        script: { exec: tests, type: 'text/javascript', packages: {} },
      },
    ],
    auth: {},
    request: {
      auth: {},
      method,
      header: [],
      url: {
        raw: url + (query.length ? '?' + query.filter(q => !q.disabled).map(q => `${q.key}=${q.value}`).join('&') : ''),
        host: ['{{baseUrl}}'],
        path: pathParts,
        query,
        variable: [],
      },
    },
    response: [],
    protocolProfileBehavior: { strictSSL: false, followRedirects: true },
  };
}

function unauthItem(name, description, urlPath) {
  return {
    name,
    description,
    event: [
      {
        listen: 'test',
        script: {
          exec: ['pm.test("Status 401", () => pm.response.to.have.status(401));'],
          type: 'text/javascript',
          packages: {},
        },
      },
    ],
    auth: { type: 'noauth' },
    request: {
      auth: { type: 'noauth' },
      method: 'GET',
      header: [{ key: 'Cookie', value: '', type: 'text' }],
      url: {
        raw: urlPath,
        host: ['{{baseUrl}}'],
        path: urlPath.replace('{{baseUrl}}/', '').split('/'),
        query: [],
        variable: [],
      },
    },
    response: [],
    protocolProfileBehavior: { strictSSL: false, followRedirects: true },
  };
}

const clientsFolder = {
  name: 'Clients',
  description:
    'Supplier-facing client management. All routes require a supplier session (SessionAuthGuard + IsFullyVerifiedSupplier). The buyerId path param is the buyer\'s public UUID.',
  item: [
    // ── Listing ───────────────────────────────────────────────────
    item(
      'List Clients',
      'Returns paginated buyers with paid/fulfilled orders for this supplier plus summary KPIs. Set buyerId variable from first item.',
      'GET',
      '{{baseUrl}}/clients',
      [
        ['page', '1'],
        ['limit', '20'],
        ['status', 'all', true],
        ['classification', 'VIP', true],
        ['country', 'SA', true],
        ['dateAdded', '30d', true],
        ['search', '', true],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Has pagination + summary shape", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j).to.have.all.keys(["items","total","page","limit","summary"]);',
        '  pm.expect(j.summary).to.have.all.keys(["totalClients","totalLifetimeValueSar","vipAndAgentCount","totalOrders"]);',
        '  pm.expect(j.page).to.eql(1);',
        '  pm.expect(j.limit).to.eql(20);',
        '});',
        'pm.test("Items have derived fields", () => {',
        '  const items = pm.response.json().items;',
        '  if (items.length > 0) {',
        '    pm.expect(items[0]).to.include.all.keys(["id","classification","activityStatus","creditTerms","averageOrderValueSar","daysSinceLastOrder"]);',
        '  }',
        '});',
      ],
      'buyerId',
    ),

    item(
      'List Clients — Active + VIP filter',
      'Filter to active buyers (last order <= 60 days ago) with classification VIP (lifetime >= 250K SAR).',
      'GET',
      '{{baseUrl}}/clients',
      [
        ['status', 'active'],
        ['classification', 'VIP'],
        ['page', '1'],
        ['limit', '20'],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("All items match filter", () => {',
        '  pm.response.json().items.forEach(item => {',
        '    pm.expect(item.classification).to.eql("VIP");',
        '    pm.expect(item.activityStatus).to.eql("ACTIVE");',
        '  });',
        '});',
      ],
    ),

    item(
      'List Clients — Inactive + PERMANENT filter',
      'Filter to inactive buyers (last order > 60 days ago) with PERMANENT classification (>= 5 orders, < 250K SAR).',
      'GET',
      '{{baseUrl}}/clients',
      [
        ['status', 'inactive'],
        ['classification', 'PERMANENT'],
        ['page', '1'],
        ['limit', '20'],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("All items match filter", () => {',
        '  pm.response.json().items.forEach(item => {',
        '    pm.expect(item.classification).to.eql("PERMANENT");',
        '    pm.expect(item.activityStatus).to.eql("INACTIVE");',
        '  });',
        '});',
      ],
    ),

    item(
      'List Clients — Search',
      'Full-text search on buyer name and email (ILIKE). Replace search value with a known buyer name fragment.',
      'GET',
      '{{baseUrl}}/clients',
      [
        ['search', 'ahmed'],
        ['page', '1'],
        ['limit', '20'],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Has pagination shape", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j).to.have.keys(["items","total","page","limit","summary"]);',
        '});',
      ],
    ),

    item(
      'List Clients — Country filter (SA)',
      'Filter buyers with country = SA.',
      'GET',
      '{{baseUrl}}/clients',
      [
        ['country', 'SA'],
        ['page', '1'],
        ['limit', '20'],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("All items are SA", () => {',
        '  pm.response.json().items.forEach(item => {',
        '    pm.expect(item.country).to.eql("SA");',
        '  });',
        '});',
      ],
    ),

    item(
      'List Clients — dateAdded last 30 days',
      'Filter buyers whose first order with this supplier was in the last 30 days.',
      'GET',
      '{{baseUrl}}/clients',
      [
        ['dateAdded', '30d'],
        ['page', '1'],
        ['limit', '20'],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
      ],
    ),

    item(
      'List Clients — page 2',
      'Pagination: second page. Verify page field reflects the requested page.',
      'GET',
      '{{baseUrl}}/clients',
      [
        ['page', '2'],
        ['limit', '10'],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Correct page number returned", () => {',
        '  pm.expect(pm.response.json().page).to.eql(2);',
        '  pm.expect(pm.response.json().limit).to.eql(10);',
        '});',
      ],
    ),

    // ── Drill-down ─────────────────────────────────────────────────
    item(
      'Get Client Header',
      'Returns buyer profile header for {{buyerId}}. 404 if buyer has no orders with this supplier.',
      'GET',
      '{{baseUrl}}/clients/{{buyerId}}',
      [],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Has header fields", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j).to.have.all.keys(["id","name","company","email","avatar","country","joinedAt","initialsAvatarSeed"]);',
        '  pm.expect(j.id).to.be.a("string");',
        '  pm.expect(j.initialsAvatarSeed).to.be.a("string").with.lengthOf(1);',
        '});',
      ],
    ),

    {
      name: 'Get Client Header — 404 unknown buyer',
      description: 'A nil UUID must return 404 — no enumeration of other suppliers\' buyers.',
      event: [
        {
          listen: 'test',
          script: {
            exec: ['pm.test("Status 404", () => pm.response.to.have.status(404));'],
            type: 'text/javascript',
            packages: {},
          },
        },
      ],
      auth: {},
      request: {
        auth: {},
        method: 'GET',
        header: [],
        url: {
          raw: '{{baseUrl}}/clients/00000000-0000-0000-0000-000000000000',
          host: ['{{baseUrl}}'],
          path: ['clients', '00000000-0000-0000-0000-000000000000'],
          query: [],
          variable: [],
        },
      },
      response: [],
      protocolProfileBehavior: { strictSSL: false, followRedirects: true },
    },

    item(
      'Get Client Stats',
      'Returns totalOrders, lifetimeValueSar, creditLimitSar (100K placeholder), responseRate (null phase-2).',
      'GET',
      '{{baseUrl}}/clients/{{buyerId}}/stats',
      [],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Has stats shape", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j).to.have.all.keys(["totalOrders","lifetimeValueSar","creditLimitSar","responseRate"]);',
        '  pm.expect(j.creditLimitSar).to.eql(100000);',
        '  pm.expect(j.responseRate).to.be.null;',
        '  pm.expect(j.totalOrders).to.be.a("number").and.at.least(1);',
        '});',
      ],
    ),

    item(
      'Get Client Orders',
      'Paginated list of trade_orders for this buyer↔supplier pair, ordered by created_at DESC.',
      'GET',
      '{{baseUrl}}/clients/{{buyerId}}/orders',
      [
        ['page', '1'],
        ['limit', '20'],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Has pagination shape", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j).to.have.all.keys(["items","total","page","limit"]);',
        '  pm.expect(j.page).to.eql(1);',
        '  pm.expect(j.limit).to.eql(20);',
        '});',
      ],
    ),

    item(
      'Get Client Orders — page 2',
      'Pagination sanity check on orders tab.',
      'GET',
      '{{baseUrl}}/clients/{{buyerId}}/orders',
      [
        ['page', '2'],
        ['limit', '5'],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Correct page/limit echoed", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j.page).to.eql(2);',
        '  pm.expect(j.limit).to.eql(5);',
        '});',
      ],
    ),

    item(
      'Get Client Quotations',
      'Paginated supplier quotations sent for RFQs from this buyer.',
      'GET',
      '{{baseUrl}}/clients/{{buyerId}}/quotations',
      [
        ['page', '1'],
        ['limit', '20'],
      ],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Has pagination shape", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j).to.have.all.keys(["items","total","page","limit"]);',
        '});',
      ],
    ),

    // ── Phase-1 stubs ──────────────────────────────────────────────
    item(
      'Get Client Sample Requests (stub)',
      'Phase-1 stub. Must return empty items array and 404 for unknown buyerId.',
      'GET',
      '{{baseUrl}}/clients/{{buyerId}}/sample-requests',
      [],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Empty stub shape", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j.items).to.eql([]);',
        '  pm.expect(j.total).to.eql(0);',
        '  pm.expect(j.page).to.eql(1);',
        '  pm.expect(j.limit).to.eql(20);',
        '});',
      ],
    ),

    item(
      'Get Client Chat Threads (stub)',
      'Phase-1 stub. Must return empty items array.',
      'GET',
      '{{baseUrl}}/clients/{{buyerId}}/chat-threads',
      [],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Empty stub shape", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j.items).to.eql([]);',
        '  pm.expect(j.total).to.eql(0);',
        '});',
      ],
    ),

    item(
      'Get Client Notes (stub)',
      'Phase-1 stub. Must return empty items array.',
      'GET',
      '{{baseUrl}}/clients/{{buyerId}}/notes',
      [],
      [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Empty stub shape", () => {',
        '  const j = pm.response.json();',
        '  pm.expect(j.items).to.eql([]);',
        '  pm.expect(j.total).to.eql(0);',
        '});',
      ],
    ),

    // ── Auth / guard regression ────────────────────────────────────
    unauthItem(
      'List Clients — Unauthenticated (401)',
      'Regression: no session cookie must return 401.',
      '{{baseUrl}}/clients',
    ),

    unauthItem(
      'Get Client Header — Unauthenticated (401)',
      'Regression: no session cookie must return 401.',
      '{{baseUrl}}/clients/{{buyerId}}',
    ),
  ],
};

col.item.push(clientsFolder);

if (!col.variable) col.variable = [];
if (!col.variable.find((v) => v.key === 'buyerId')) {
  col.variable.push({ key: 'buyerId', value: '', type: 'string' });
}

fs.writeFileSync(colPath, JSON.stringify(col, null, 2));
console.log('Injected Clients folder. Folders:', col.item.map((i) => i.name).join(', '));
console.log('Variables:', col.variable.map((v) => v.key).join(', '));
