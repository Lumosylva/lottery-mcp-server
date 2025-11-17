// API返回的原始数据结构
export interface LotteryApiResponse {
  result: LotteryRawData[];
  state: number;
  message: string;
  Tflag: number;
}

export interface LotteryRawData {
  date: string;
  code: string;
  red: string;
  blue: string;
  poolmoney?: string;
  sales?: string;
  content?: string;
  prizegrades?: any[];
  [key: string]: any;
}

// 我们返回的简化数据结构
export interface LotteryData {
  date: string;
  code: string;
  red: string;
  blue: string;
}

// 频率统计
export interface FrequencyStats {
  number: string;
  count: number;
  percentage: number;
}

// 分析结果
export interface AnalysisResult {
  totalDraws: number;
  redBallStats: FrequencyStats[];
  blueBallStats: FrequencyStats[];
  recommendations: {
    red: string;
    blue: string;
  }[];
  disclaimer: string;
}
