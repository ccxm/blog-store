import Axios from './axios.js'
const successCode = 10000

// 初始化axios，并返回一个axios的实例
const httpInstance = Axios.create({
	timeout: 6000,
	baseURL: 'https://mall.cxmmao.com/api-mall',
})

// 请求前拦截，一般进行一些权限的校验，如加入token或其他请求头
httpInstance.interceptors.request.use(async config => {
	// config.Authorization = 'Cxm Token'
	console.log('请求发送前的数据')
	console.log(config)
	return config
}, error => {
	console.log(error)
})

// 响应前拦截，一般进行响应数据的过来，判断是不是成功的响应
httpInstance.interceptors.response.use(response => {
	const resData = response.data
	console.log('请求响应前的数据')
	console.log(response)
	if (response.statusCode === 200) {
		// 只要是成功的响应才返回响应的data，否则都是走error回调
		if (resData.code === successCode) {
			return resData.data
		}else {
			console.log(`响应状态码不为${successCode}，请求出错，将被catch捕捉`)
			return Promise.reject(resData)
		}
	}else {
		if(response.statusCode === 401) {
			console.log('没有权限')
		}
		return Promise.reject(resData)
	}
	return response.data
}, error => {
	console.log('请求出错')
	if(error.response.statusCode === 404) {
		console.log('请求接口不存在')
	}
	return Promise.reject(error)
})

export default httpInstance
