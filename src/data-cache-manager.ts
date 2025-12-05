import fs from 'fs';
import path from 'path';
import { LotteryData } from './types';

const DATA_CACHE_FILE = path.join(__dirname, '../lottery-data-cache.json');

interface DataCache {
  data: LotteryData[];
  date: string; // 缓存日期 YYYY-MM-DD
  timestamp: number; // 缓存时间戳
  cacheTime: string; // 缓存时间 HH:mm:ss
}

/**
 * 获取当前日期字符串 YYYY-MM-DD
 */
function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 获取当前时间字符串 HH:mm:ss
 */
function getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

/**
 * 获取星期几 (0=周日, 1=周一, ..., 6=周六)
 */
function getDayOfWeek(): number {
  return new Date().getDay();
}

/**
 * 检查是否为开奖日 (周二=2, 周四=4, 周日=0)
 */
function isDrawDay(): boolean {
  const day = getDayOfWeek();
  return day === 0 || day === 2 || day === 4;
}

/**
 * 检查当前时间是否在开奖后 (21:15:00之后)
 */
function isAfterDrawTime(): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  // 21:15:00 = 21*3600 + 15*60 = 76500秒
  const currentSeconds = hours * 3600 + minutes * 60 + seconds;
  const drawTimeSeconds = 21 * 3600 + 15 * 60; // 21:15:00
  
  return currentSeconds >= drawTimeSeconds;
}

/**
 * 从缓存文件读取数据
 */
function readDataFromCache(): DataCache | null {
  try {
    if (fs.existsSync(DATA_CACHE_FILE)) {
      const data = fs.readFileSync(DATA_CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Data Cache] 读取缓存文件失败:', error);
  }
  return null;
}

/**
 * 将数据保存到缓存文件
 */
function saveDataToCache(data: LotteryData[]): void {
  try {
    const cache: DataCache = {
      data,
      date: getCurrentDate(),
      timestamp: Date.now(),
      cacheTime: getCurrentTime()
    };
    fs.writeFileSync(DATA_CACHE_FILE, JSON.stringify(cache, null, 2));
    console.error(`[Data Cache] 数据已缓存，共${data.length}条记录，缓存时间: ${cache.cacheTime}`);
  } catch (error) {
    console.error('[Data Cache] 保存缓存文件失败:', error);
  }
}

/**
 * 检查缓存是否有效
 * 规则：
 * 1. 如果不是开奖日，同一自然日内缓存有效
 * 2. 如果是开奖日且当前时间在21:15:00之前，同一自然日内缓存有效
 * 3. 如果是开奖日且当前时间在21:15:00之后，缓存无效（需要获取新数据）
 */
function isCacheValid(cache: DataCache | null): boolean {
  if (!cache) {
    console.error('[Data Cache] 没有缓存数据');
    return false;
  }

  const today = getCurrentDate();
  const cacheDate = cache.date;

  // 检查是否是同一自然日
  if (cacheDate !== today) {
    console.error(`[Data Cache] 缓存日期已过期 (缓存日期: ${cacheDate}, 当前日期: ${today})`);
    return false;
  }

  // 同一自然日，检查是否是开奖日且是否已过开奖时间
  if (isDrawDay() && isAfterDrawTime()) {
    console.error(`[Data Cache] 开奖日已过开奖时间(21:15:00)，缓存无效，需要获取新数据`);
    return false;
  }

  console.error(`[Data Cache] 使用缓存数据 (缓存日期: ${cacheDate}, 缓存时间: ${cache.cacheTime})`);
  return true;
}

/**
 * 获取缓存的数据或返回null
 */
export function getCachedData(): LotteryData[] | null {
  const cache = readDataFromCache();
  
  if (isCacheValid(cache)) {
    return cache!.data;
  }
  
  return null;
}

/**
 * 保存数据到缓存
 */
export function saveLotteryDataToCache(data: LotteryData[]): void {
  saveDataToCache(data);
}

/**
 * 清除缓存
 */
export function clearDataCache(): void {
  try {
    if (fs.existsSync(DATA_CACHE_FILE)) {
      fs.unlinkSync(DATA_CACHE_FILE);
      console.error('[Data Cache] 缓存已清除');
    }
  } catch (error) {
    console.error('[Data Cache] 清除缓存失败:', error);
  }
}

/**
 * 获取缓存信息
 */
export function getCacheInfo(): { valid: boolean; date?: string; time?: string; recordCount?: number } {
  const cache = readDataFromCache();
  
  if (!cache) {
    return { valid: false };
  }

  return {
    valid: isCacheValid(cache),
    date: cache.date,
    time: cache.cacheTime,
    recordCount: cache.data.length
  };
}
