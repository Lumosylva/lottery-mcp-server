import https from 'https';
import fs from 'fs';
import path from 'path';

const COOKIE_CACHE_FILE = path.join(__dirname, '../cookie-cache.json');
const COOKIE_EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2小时

interface CookieCache {
  cookie: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * 检查cookie是否过期
 */
function isCookieExpired(cache: CookieCache | null): boolean {
  if (!cache) return true;
  return Date.now() > cache.expiresAt;
}

/**
 * 从缓存文件读取cookie
 */
function readCookieFromCache(): CookieCache | null {
  try {
    if (fs.existsSync(COOKIE_CACHE_FILE)) {
      const data = fs.readFileSync(COOKIE_CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取cookie缓存失败:', error);
  }
  return null;
}

/**
 * 将cookie保存到缓存文件
 */
function saveCookieToCache(cookie: string): void {
  try {
    const cache: CookieCache = {
      cookie,
      timestamp: Date.now(),
      expiresAt: Date.now() + COOKIE_EXPIRY_TIME
    };
    fs.writeFileSync(COOKIE_CACHE_FILE, JSON.stringify(cache, null, 2));
    console.error(`[Cookie Manager] Cookie已保存，有效期至 ${new Date(cache.expiresAt).toLocaleString()}`);
  } catch (error) {
    console.error('保存cookie缓存失败:', error);
  }
}

/**
 * 从API获取新的cookie
 */
async function fetchNewCookie(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.error('[Cookie Manager] 正在获取新的cookie...');

    // 第一步：访问主页获取初始cookie
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

      if (!hmfCi) {
        reject(new Error('无法从主页获取HMF_CI cookie'));
        return;
      }

      // 第二步：使用cookie访问API端点验证
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
            if (json.state === 0 && json.result) {
              console.error(`[Cookie Manager] Cookie获取成功，数据包含 ${json.result.length} 条记录`);
              resolve(hmfCi);
            } else {
              reject(new Error('API返回错误状态'));
            }
          } catch (e) {
            reject(new Error(`API响应解析失败: ${e}`));
          }
        });
      }).on('error', reject);
    }).on('error', reject);
  });
}

/**
 * 获取有效的cookie（自动刷新过期的）
 */
export async function getCookie(): Promise<string> {
  const cachedCookie = readCookieFromCache();

  // 检查缓存的cookie是否仍然有效
  if (!isCookieExpired(cachedCookie)) {
    console.error(`[Cookie Manager] 使用缓存的cookie，剩余有效期: ${Math.round((cachedCookie!.expiresAt - Date.now()) / 1000 / 60)} 分钟`);
    return cachedCookie!.cookie;
  }

  // Cookie已过期或不存在，获取新的
  try {
    const newCookie = await fetchNewCookie();
    saveCookieToCache(newCookie);
    return newCookie;
  } catch (error) {
    console.error('[Cookie Manager] 获取新cookie失败:', error);
    
    // 如果获取失败但有过期的缓存，仍然返回它（可能还能用）
    if (cachedCookie) {
      console.error('[Cookie Manager] 使用过期的缓存cookie作为备选');
      return cachedCookie.cookie;
    }
    
    throw new Error(`无法获取有效的cookie: ${error}`);
  }
}

/**
 * 清除缓存的cookie
 */
export function clearCookieCache(): void {
  try {
    if (fs.existsSync(COOKIE_CACHE_FILE)) {
      fs.unlinkSync(COOKIE_CACHE_FILE);
      console.error('[Cookie Manager] Cookie缓存已清除');
    }
  } catch (error) {
    console.error('[Cookie Manager] 清除cookie缓存失败:', error);
  }
}
