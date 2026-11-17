import http from 'http';

function get(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve(`HTTP ${res.statusCode}: ${body.substring(0, 500)}`));
    }).on('error', reject);
  });
}

async function main() {
  // Test rank-lookup
  const r1 = await get('/api/rank-lookup?score=628&province=' + encodeURIComponent('广东') + '&subjectType=' + encodeURIComponent('物理'));
  console.log('rank-lookup:', r1);

  // Test batch-lines
  const r2 = await get('/api/batch-lines?province=' + encodeURIComponent('广东') + '&subjectType=' + encodeURIComponent('物理'));
  console.log('batch-lines:', r2);

  // Test recommend via POST
  const data = JSON.stringify({
    province: '广东省', score: 628,
    subjects: ['物理','化学','生物'],
    preferences: { subjectType: '物理', preferredCities: ['广州','北京','杭州'], disciplines: ['工学'] }
  });
  const req = http.request({ hostname:'localhost', port:3000, path:'/api/recommend', method:'POST',
    headers: {'Content-Type':'application/json; charset=utf-8','Content-Length': Buffer.byteLength(data)} }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      const d = JSON.parse(body);
      console.log(`recommend HTTP ${res.statusCode}: ${d.data?.length || 0} items`);
      if (d.data) for (const i of d.data.slice(0,3)) console.log(`  ${i.tier} | ${i.college} | ${i.city} | LLM:${i.reason !== '基于历年录取位次自动推荐'} | p:${i.purity}`);
    });
  });
  req.write(data); req.end();
}
main().catch(e => console.error(e.message));
