const https = require('https');
const fs = require('fs');
const path = require('path');

const COOKIE_CACHE_FILE = path.join(__dirname, 'cookie-cache.json');

// 获取初始cookie
https.get('https://www.cwl.gov.cn/ygkj/wqkjgg/', {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
  }
}, (res) => {
  let cookies = res.headers['set-cookie'];
  let hmfCi = '';
  
  if (cookies) {
    cookies.forEach(cookie => {
      if (cookie.includes('HMF_CI')) {
        hmfCi = cookie.split(';')[0];
      }
    });
  }
  
  console.log('Step 1 - Initial Cookie:', hmfCi);
  
  // 使用cookie访问API端点
  const options = {
    hostname: 'www.cwl.gov.cn',
    path: '/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=ssq',
    method: 'GET',
    headers: {
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'referer': 'https://www.cwl.gov.cn/ygkj/wqkjgg/',
      'cookie': hmfCi,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    }
  };
  
  https.get(options, (res2) => {
    let data = '';
    res2.on('data', (chunk) => {
      data += chunk;
    });
    
    res2.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('\n✅ API Response Success!');
        console.log('Cookie to use:', hmfCi);
        console.log('Data received:', json.result ? `${json.result.length} records` : 'No data');
        
        // 保存cookie到缓存文件
        const COOKIE_EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2小时
        const cache = {
          cookie: hmfCi,
          timestamp: Date.now(),
          expiresAt: Date.now() + COOKIE_EXPIRY_TIME
        };
        
        fs.writeFileSync(COOKIE_CACHE_FILE, JSON.stringify(cache, null, 2));
        console.log('\n✅ Cookie已自动保存到 cookie-cache.json');
        console.log(`有效期至: ${new Date(cache.expiresAt).toLocaleString()}`);
      } catch (e) {
        console.log('\n❌ API Response Error:');
        console.log('Response starts with:', data.substring(0, 100));
        console.log('Cookie:', hmfCi);
      }
    });
  }).on('error', (e) => {
    console.error('API Error:', e);
  });
  
}).on('error', (e) => {
  console.error('Initial Error:', e);
});
