接口url及参数：

https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=ssq

说明：这是一个获取双色球彩票历史一等奖开奖号码的接口，包含从2013-01-01到2025-11-16的所有数据，其中name代表彩票种类，ssq代表双色球

接口类型：GET

请求头：

accept：application/json, text/javascript, */*; q=0.01

referer：https://www.cwl.gov.cn/ygkj/wqkjgg/

cookie：HMF_CI=6e28aa79b81356fbb19efefb2046d5a894f39df3c89dc9e54c2d9ea9db4a5f3353d399f435faaf9c66a69c451aa049faf6f61e65664d3964a7d642afc7c41cee5a; 21_vq=5

user-agent：Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36

返回结果(更多数据中间用...表示)：

```json
{
	"result":[
		{
			"date":"2025-11-16(日)",
			"msg":"",
			"poolmoney":"2810082951",
			"code":"2025132",
			"week":"日",
			"m2add":"",
			"addmoney":"",
			"z2add":"",
			"detailsLink":"/c/2025/11/16/635605.shtml",
			"sales":"409235610",
			"content":"上海1注，江苏1注，浙江1注，山东1注，河南1注，四川3注，共8注。",
			"blue2":"",
			"red":"04,08,10,21,23,32",
			"addmoney2":"",
			"blue":"11",
			"name":"双色球",
			"videoLink":"/c/2025/11/16/635609.shtml",
			"prizegrades":[
				{
					"typenum":"8",
					"type":1,
					"typemoney":"7322334"
				},
				{
					"typenum":"135",
					"type":2,
					"typemoney":"172024"
				},
				{
					"typenum":"1717",
					"type":3,
					"typemoney":"3000"
				},
				{
					"typenum":"82327",
					"type":4,
					"typemoney":"200"
				},
				{
					"typenum":"1500137",
					"type":5,
					"typemoney":"10"
				},
				{
					"typenum":"14202861",
					"type":6,
					"typemoney":"5"
				},
				{
					"typenum":"",
					"type":7,
					"typemoney":""
				}
			]
		},
        ...
        {
			"date":"2013-01-01(二)",
			"msg":"中彩中心决定：从双色球调节基金拨出12541580元，注入第2013002期奖池，第2013002期奖池资金原为：17458420.00元,累计金额为：30000000.00元。",
			"poolmoney":"30000000",
			"code":"2013001",
			"week":"二",
			"m2add":"",
			"addmoney":"5000000",
			"z2add":"",
			"detailsLink":"/c/2013/01/01/384379.shtml",
			"sales":"309153922",
			"content":"河北1注,山西1注,上海2注,江苏1注,浙江1注,山东3注,湖南1注,广东7注,广西1注,四川1注,云南1注,共20注。",
			"blue2":"",
			"red":"06,08,14,15,24,25",
			"addmoney2":"",
			"blue":"06",
			"name":"双色球",
			"videoLink":"",
			"prizegrades":[
				{
					"typenum":"20",
					"type":1,
					"typemoney":"5250000（含加奖250000）"
				},
				{
					"typenum":"271",
					"type":2,
					"typemoney":"71485"
				},
				{
					"typenum":"2102",
					"type":3,
					"typemoney":"3000"
				},
				{
					"typenum":"86580",
					"type":4,
					"typemoney":"200"
				},
				{
					"typenum":"1412922",
					"type":5,
					"typemoney":"10"
				},
				{
					"typenum":"9831878",
					"type":6,
					"typemoney":"5"
				},
				{
					"typenum":"",
					"type":7,
					"typemoney":""
				}
			]
		}
	],
	"state":0,
	"message":"查询成功",
	"Tflag":0
}
```

返回结果说明：返回数据结构为json数据，其中result内的列表为每期开奖详细数据，其中date代表开奖日期，code代表期号，red代表红色球中奖号码，中间用,分割，blue代表蓝球中奖号码，我们主要关注这几个字段数据。

