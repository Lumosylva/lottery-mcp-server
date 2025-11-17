import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  getAllHistory,
  getByDateRange,
  getByCode,
  getLatest,
  analyzeAndGenerateNumbers
} from './lottery-api';

// 创建MCP服务器实例
const server = new Server(
  {
    name: "lottery-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_all_lottery_history",
        description: "获取双色球所有历史一等奖数据(从2013年至今)",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_lottery_by_date_range",
        description: "按日期范围查询双色球开奖数据",
        inputSchema: {
          type: "object",
          properties: {
            startDate: {
              type: "string",
              description: "开始日期，格式: YYYY-MM-DD，例如: 2025-01-01"
            },
            endDate: {
              type: "string",
              description: "结束日期，格式: YYYY-MM-DD，例如: 2025-12-31"
            }
          },
          required: ["startDate", "endDate"]
        }
      },
      {
        name: "get_lottery_by_code",
        description: "按期号查询双色球开奖数据",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "期号，例如: 2025132"
            }
          },
          required: ["code"]
        }
      },
      {
        name: "get_latest_lottery",
        description: "获取最新N期双色球开奖数据",
        inputSchema: {
          type: "object",
          properties: {
            count: {
              type: "number",
              description: "获取期数，默认为10",
              default: 10
            }
          },
          required: []
        }
      },
      {
        name: "analyze_and_predict",
        description: "分析双色球历史数据并基于高频号码生成10组参考号码（仅供参考，不代表预测）",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ]
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_all_lottery_history": {
        const data = await getAllHistory();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case "get_lottery_by_date_range": {
        const { startDate, endDate } = args as { startDate: string; endDate: string };
        
        // 验证日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
          throw new Error("日期格式错误，请使用 YYYY-MM-DD 格式");
        }

        const data = await getByDateRange(startDate, endDate);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case "get_lottery_by_code": {
        const { code } = args as { code: string };
        
        if (!code) {
          throw new Error("期号不能为空");
        }

        const data = await getByCode(code);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case "get_latest_lottery": {
        const { count = 10 } = args as { count?: number };
        
        if (count <= 0) {
          throw new Error("获取期数必须大于0");
        }

        const data = await getLatest(count);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case "analyze_and_predict": {
        const result = await analyzeAndGenerateNumbers();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`未知的工具: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lottery MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
