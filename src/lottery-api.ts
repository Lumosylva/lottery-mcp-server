import https from 'https';
import { LotteryApiResponse, LotteryRawData, LotteryData, FrequencyStats, AnalysisResult, SumValueResult, ACValueResult } from './types';
import { getCookie } from './cookie-manager';
import { getCachedData, saveLotteryDataToCache } from './data-cache-manager';

// 内存缓存数据（二级缓存）
let cachedData: LotteryData[] | null = null;

/**
 * 从API获取双色球数据
 */
export async function fetchLotteryData(): Promise<LotteryApiResponse> {
  // 获取有效的cookie（自动刷新过期的）
  const cookie = await getCookie();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.cwl.gov.cn',
      path: '/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=ssq',
      method: 'GET',
      headers: {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'referer': 'https://www.cwl.gov.cn/ygkj/wqkjgg/',
        'cookie': cookie,
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
 * 缓存策略：
 * 1. 先检查内存缓存（二级缓存）
 * 2. 再检查文件缓存（一级缓存）
 * 3. 最后从API获取新数据
 */
export async function getCachedOrFetchData(): Promise<LotteryData[]> {
  // 检查内存缓存
  if (cachedData !== null) {
    console.error('[Lottery API] 使用内存缓存数据');
    return cachedData;
  }

  // 检查文件缓存
  const fileCache = getCachedData();
  if (fileCache !== null) {
    cachedData = fileCache;
    return cachedData;
  }

  // 从API获取新数据
  console.error('[Lottery API] 从API获取新数据...');
  const apiResponse = await fetchLotteryData();
  
  if (apiResponse.state !== 0) {
    throw new Error(`API返回错误: ${apiResponse.message}`);
  }

  cachedData = transformData(apiResponse.result);
  
  // 保存到文件缓存
  saveLotteryDataToCache(cachedData);
  
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
 * 创建历史号码集合用于快速查询
 */
function createHistoricalCombinationSet(allData: LotteryData[]): Set<string> {
  const historicalCombinations = new Set<string>();
  allData.forEach(item => {
    const redBalls = item.red.split(',').map(b => b.trim()).sort((a, b) => Number(a) - Number(b));
    const combination = redBalls.join(',') + '|' + item.blue.trim();
    historicalCombinations.add(combination);
  });
  return historicalCombinations;
}

/**
 * 检查号码组合是否满足条件
 * 条件：1. 不在历史数据中 2. 和值在60-140之间 3. AC值在7-9之间
 */
function isValidCombination(
  redBalls: string[],
  blue: string,
  historicalCombinations: Set<string>
): boolean {
  // 检查是否在历史数据中
  const combination = redBalls.join(',') + '|' + blue;
  if (historicalCombinations.has(combination)) {
    return false;
  }

  // 检查和值是否在60-140之间
  const sumValue = calculateSumValue(redBalls.join(','));
  if (sumValue < 60 || sumValue > 140) {
    return false;
  }

  // 检查AC值是否在7-9之间
  const acValue = calculateACValue(redBalls.join(','));
  if (acValue < 7 || acValue > 9) {
    return false;
  }

  return true;
}

/**
 * 生成推荐号码组合（改进版）
 * 推荐号码必须满足：
 * 1. 不在历史开奖数据中
 * 2. 和值在60-140之间（100%的开奖号码都在此范围）
 * 3. AC值在7-9之间（超过85%的开奖号码AC值在此范围）
 */
function generateRecommendations(
  redStats: FrequencyStats[],
  blueStats: FrequencyStats[],
  allData: LotteryData[]
): { red: string; blue: string }[] {
  const recommendations: { red: string; blue: string }[] = [];
  const highFreqRed = redStats.slice(0, 20).map(s => s.number); // 取前20个高频红球
  const highFreqBlue = blueStats.slice(0, 8).map(s => s.number); // 取前8个高频蓝球
  
  // 创建历史号码集合
  const historicalCombinations = createHistoricalCombinationSet(allData);
  
  // 生成10组满足条件的组合
  const usedCombinations = new Set<string>();
  let attempts = 0;
  const maxAttempts = 10000; // 防止无限循环
  
  while (recommendations.length < 10 && attempts < maxAttempts) {
    attempts++;
    
    // 从高频红球中随机选6个
    const selectedRed: string[] = [];
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
    if (usedCombinations.has(combination)) {
      continue;
    }
    
    // 检查是否满足条件
    if (isValidCombination(selectedRed, selectedBlue, historicalCombinations)) {
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
  
  // 生成推荐号码（改进版：排除历史号码、满足和值和AC值条件）
  const recommendations = generateRecommendations(redBallStats, blueBallStats, allData);
  
  return {
    totalDraws: allData.length,
    redBallStats: redBallStats.slice(0, 20), // 返回前20个高频红球
    blueBallStats: blueBallStats.slice(0, 10), // 返回前10个高频蓝球
    recommendations,
    disclaimer: '⚠️ 重要提醒：彩票开奖是完全随机的，历史数据不能预测未来结果。以上号码基于历史频率统计、排除历史开奖号码、满足和值(60-140)和AC值(7-9)条件生成，仅供参考，不代表任何中奖保证。请理性购彩，任何号码组合的中奖概率都是相同的（约1/17,721,088）。'
  };
}

/**
 * 计算红球和值（红球号码之和）
 */
function calculateSumValue(redBalls: string): number {
  const balls = redBalls.split(',').map(b => parseInt(b.trim(), 10));
  return balls.reduce((sum, ball) => sum + ball, 0);
}

/**
 * 计算AC值（算术复杂性）
 * AC值 = 不同差值的个数 - (号码数量 - 1)
 */
function calculateACValue(redBalls: string): number {
  const balls = redBalls.split(',').map(b => parseInt(b.trim(), 10)).sort((a, b) => a - b);
  
  // 计算所有两两之间的差值
  const differences = new Set<number>();
  
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      differences.add(balls[j] - balls[i]);
    }
  }
  
  // AC值 = 不同差值的个数 - (号码数量 - 1)
  return differences.size - (balls.length - 1);
}

/**
 * 获取最近N期的和值数据
 */
export async function getLatestSumValues(count: number = 10): Promise<SumValueResult> {
  const allData = await getCachedOrFetchData();
  const latestData = allData.slice(0, count);
  
  // 计算每期的和值
  const data = latestData.map(item => ({
    date: item.date,
    code: item.code,
    red: item.red,
    sumValue: calculateSumValue(item.red)
  }));
  
  // 计算统计信息
  const sumValues = data.map(d => d.sumValue);
  const average = sumValues.reduce((a, b) => a + b, 0) / sumValues.length;
  const variance = sumValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / sumValues.length;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    count: data.length,
    data,
    statistics: {
      averageSumValue: Number(average.toFixed(2)),
      minSumValue: Math.min(...sumValues),
      maxSumValue: Math.max(...sumValues),
      standardDeviation: Number(standardDeviation.toFixed(2))
    }
  };
}

/**
 * 获取最近N期的AC值数据
 */
export async function getLatestACValues(count: number = 10): Promise<ACValueResult> {
  const allData = await getCachedOrFetchData();
  const latestData = allData.slice(0, count);
  
  // 计算每期的AC值
  const data = latestData.map(item => ({
    date: item.date,
    code: item.code,
    red: item.red,
    acValue: calculateACValue(item.red)
  }));
  
  // 计算统计信息
  const acValues = data.map(d => d.acValue);
  const average = acValues.reduce((a, b) => a + b, 0) / acValues.length;
  
  // 计算AC值分布
  const distribution: { [key: number]: number } = {};
  acValues.forEach(val => {
    distribution[val] = (distribution[val] || 0) + 1;
  });
  
  return {
    count: data.length,
    data,
    statistics: {
      averageACValue: Number(average.toFixed(2)),
      minACValue: Math.min(...acValues),
      maxACValue: Math.max(...acValues),
      distribution
    }
  };
}
