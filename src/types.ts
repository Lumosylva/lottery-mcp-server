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

// 和值计算结果
export interface SumValueResult {
  count: number;
  data: {
    date: string;
    code: string;
    red: string;
    sumValue: number;
  }[];
  statistics: {
    averageSumValue: number;
    minSumValue: number;
    maxSumValue: number;
    standardDeviation: number;
  };
}

// AC值计算结果
export interface ACValueResult {
  count: number;
  data: {
    date: string;
    code: string;
    red: string;
    acValue: number;
  }[];
  statistics: {
    averageACValue: number;
    minACValue: number;
    maxACValue: number;
    distribution: {
      [key: number]: number;
    };
  };
}
