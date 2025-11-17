import https from 'https';
import { LotteryApiResponse, LotteryRawData, LotteryData, FrequencyStats, AnalysisResult } from './types';

// 缓存数据
let cachedData: LotteryData[] | null = null;

/**
 * 从API获取双色球数据
 */
export async function fetchLotteryData(): Promise<LotteryApiResponse> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.cwl.gov.cn',
      path: '/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=ssq',
      method: 'GET',
      headers: {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'referer': 'https://www.cwl.gov.cn/ygkj/wqkjgg/',
        'cookie': 'HMF_CI=6e28aa79b81356fbb19efefb2046d5a894f39df3c89dc9e54c2d9ea9db4a5f3353d399f435faaf9c66a69c451aa049faf6f61e65664d3964a7d642afc7c41cee5a; 21_vq=5',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data) as LotteryApiResponse;
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`JSON解析失败: ${error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`网络请求失败: ${error.message}`));
    });

    req.end();
  });
}

/**
 * 转换原始数据为简化格式
 */
export function transformData(rawData: LotteryRawData[]): LotteryData[] {
  return rawData.map(item => ({
    date: item.date,
    code: item.code,
    red: item.red,
    blue: item.blue
  }));
}

/**
 * 获取缓存数据或从API获取
 */
export async function getCachedOrFetchData(): Promise<LotteryData[]> {
  if (cachedData !== null) {
    return cachedData;
  }

  const apiResponse = await fetchLotteryData();
  
  if (apiResponse.state !== 0) {
    throw new Error(`API返回错误: ${apiResponse.message}`);
  }

  cachedData = transformData(apiResponse.result);
  return cachedData;
}

/**
 * 从日期字符串中提取纯日期部分
 * 例如: "2025-11-16(日)" -> "2025-11-16"
 */
function extractDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : dateStr;
}

/**
 * 获取所有历史数据
 */
export async function getAllHistory(): Promise<LotteryData[]> {
  return await getCachedOrFetchData();
}

/**
 * 按日期范围查询
 */
export async function getByDateRange(startDate: string, endDate: string): Promise<LotteryData[]> {
  const allData = await getCachedOrFetchData();
  
  return allData.filter(item => {
    const itemDate = extractDate(item.date);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

/**
 * 按期号查询
 */
export async function getByCode(code: string): Promise<LotteryData | null> {
  const allData = await getCachedOrFetchData();
  
  const result = allData.find(item => item.code === code);
  return result || null;
}

/**
 * 获取最新N期数据
 */
export async function getLatest(count: number = 10): Promise<LotteryData[]> {
  const allData = await getCachedOrFetchData();
  
  // 数据已按日期降序排列(最新的在前)
  return allData.slice(0, count);
}

/**
 * 统计红球频率
 */
function getRedBallFrequency(allData: LotteryData[]): FrequencyStats[] {
  const frequency: { [key: string]: number } = {};
  
  // 统计每个红球出现的次数
  allData.forEach(item => {
    const redBalls = item.red.split(',');
    redBalls.forEach(ball => {
      const num = ball.trim();
      frequency[num] = (frequency[num] || 0) + 1;
    });
  });
  
  // 转换为数组并排序
  const stats: FrequencyStats[] = Object.entries(frequency).map(([number, count]) => ({
    number,
    count,
    percentage: Number(((count / allData.length) * 100).toFixed(2))
  }));
  
  // 按出现次数降序排序
  stats.sort((a, b) => b.count - a.count);
  
  return stats;
}

/**
 * 统计蓝球频率
 */
function getBlueBallFrequency(allData: LotteryData[]): FrequencyStats[] {
  const frequency: { [key: string]: number } = {};
  
  // 统计每个蓝球出现的次数
  allData.forEach(item => {
    const blue = item.blue.trim();
    frequency[blue] = (frequency[blue] || 0) + 1;
  });
  
  // 转换为数组并排序
  const stats: FrequencyStats[] = Object.entries(frequency).map(([number, count]) => ({
    number,
    count,
    percentage: Number(((count / allData.length) * 100).toFixed(2))
  }));
  
  // 按出现次数降序排序
  stats.sort((a, b) => b.count - a.count);
  
  return stats;
}

/**
 * 生成推荐号码组合
 */
function generateRecommendations(redStats: FrequencyStats[], blueStats: FrequencyStats[]): { red: string; blue: string }[] {
  const recommendations: { red: string; blue: string }[] = [];
  const highFreqRed = redStats.slice(0, 15).map(s => s.number); // 取前15个高频红球
  const highFreqBlue = blueStats.slice(0, 5).map(s => s.number); // 取前5个高频蓝球
  
  // 生成10组不重复的组合
  const usedCombinations = new Set<string>();
  
  while (recommendations.length < 10) {
    // 从高频红球中随机选6个
    const selectedRed = [];
    const tempRed = [...highFreqRed];
    
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * tempRed.length);
      selectedRed.push(tempRed[randomIndex]);
      tempRed.splice(randomIndex, 1);
    }
    
    // 排序红球
    selectedRed.sort((a, b) => Number(a) - Number(b));
    
    // 从高频蓝球中随机选1个
    const selectedBlue = highFreqBlue[Math.floor(Math.random() * highFreqBlue.length)];
    
    // 检查是否重复
    const combination = selectedRed.join(',') + '|' + selectedBlue;
    if (!usedCombinations.has(combination)) {
      usedCombinations.add(combination);
      recommendations.push({
        red: selectedRed.map(n => n.padStart(2, '0')).join(','),
        blue: selectedBlue.padStart(2, '0')
      });
    }
  }
  
  return recommendations;
}

/**
 * 分析历史数据并生成推荐号码
 */
export async function analyzeAndGenerateNumbers(): Promise<AnalysisResult> {
  const allData = await getCachedOrFetchData();
  
  // 统计红球和蓝球频率
  const redBallStats = getRedBallFrequency(allData);
  const blueBallStats = getBlueBallFrequency(allData);
  
  // 生成推荐号码
  const recommendations = generateRecommendations(redBallStats, blueBallStats);
  
  return {
    totalDraws: allData.length,
    redBallStats: redBallStats.slice(0, 20), // 返回前20个高频红球
    blueBallStats: blueBallStats.slice(0, 10), // 返回前10个高频蓝球
    recommendations,
    disclaimer: '⚠️ 重要提醒：彩票开奖是完全随机的，历史数据不能预测未来结果。以上号码仅基于历史频率统计生成，仅供参考，不代表任何中奖保证。请理性购彩，任何号码组合的中奖概率都是相同的（约1/17,721,088）。'
  };
}
