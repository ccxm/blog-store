/**
 * 拦截器实现思路
 * 1、实现一个通用的请求request函数，所有请求都调用这个函数去进行网络请求
 * 2、请求调用request函数
 * 3、在正式发送请求前，执行请求前beforeRequest拦截函数
 * 4、拿到beforeRequest的返回值，其返回值是修改后的请求参数config
 * 5、正式发送请求
 * 6、在请求响应后，执行beforeResponse函数，其返回值是对response数据处理后的值
 * 7、request正式返回，请求结束
 */
const noonFunc = () => {}

export class Axios {
	constructor() {
		// 定义拦截器对象
		this.interceptors = {
			// 请求拦截
			request: {
				// 给函数绑定当前的this，否则this会指向request
				use: this.beforeRequest.bind(this),
				success: noonFunc,
				fail: noonFunc
			},
			// 相应拦截
			response: {
				use: this.beforeResponse.bind(this),
				success: noonFunc,
				fail: noonFunc
			}
		}
		// 默认的配置文件
		this.config = {
			// 请求的基础路由
			baseURL: 'http://127.0.0.1/',
			timeout: 6000,
			method: 'GET',
			dataType: 'json',
			responseType: 'text',
			Authorization: '',
			ContentType: 'application/json'
		}
	}

	/**
	 * axios的初始化函数，初始化时对config进行赋值
	 * 当参数没有传入时，使用默认参数
	 * @param baseURL
	 * @param timeout
	 * @param method
	 * @param dataType
	 * @param responseType
	 * @param ContentType
	 * @param Authorization
	 */
	static create({
		baseURL = '',
		timeout = 5000,
		method = 'GET',
		dataType = 'json',
		responseType = 'text',
		ContentType = 'application/json',
		Authorization = ''
	} = {}) {
		const axios = new Axios()
		axios.config = {
			baseURL,
			timeout,
			method,
			dataType,
			responseType,
			ContentType,
			Authorization
		}
		return axios
	}

	beforeRequest(successFunc = noonFunc(), failFunc = noonFunc()) {
		/**
		 * 成功拦截函数，传入一个config
		 * 调用拦截的时候，会调用传入的successFunc函数
		 * @param config
		 */
		this.interceptors.request.success = (config) => {
			return successFunc(config)
		}
		this.interceptors.request.fail = (error) => {
			return failFunc(error)
		}
	}

	beforeResponse(successFunc = noonFunc(), failFunc = noonFunc()) {
		this.interceptors.response.success = (response) => {
			return successFunc(response)
		}
		this.interceptors.response.fail = (error) => {
			return failFunc(error)
		}
	}

	/**
	 * 通用的request函数
	 * 其余参数用config的默认参数填充
	 * @param url
	 * @param data
	 * @param method
	 * @param timeout
	 * @param dataType
	 * @param responseType
	 * @param ContentType
	 * @param Authorization
	 * @returns {Promise<unknown>}
	 */
	async request(url, data, {
		method = this.config.method,
		timeout = this.config.timeout,
		dataType = this.config.dataType,
		responseType = this.config.responseType,
		ContentType = this.config.ContentType,
		Authorization = this.config.Authorization
	} = {}) {
		let config = {
			url,
			method,
			data,
			timeout,
			dataType,
			responseType,
			ContentType,
			Authorization
		}
		// 如果是http://,https://开头的，则不走拦截
		if(this._checkIsOriginRequest(url)) {
			return this.sendRequest(config)
		}
		return new Promise(async (resolve, reject) => {
			// 请求前的拦截，一定要用await，因为拦截函数可能会有一些异步的操作
			config = await this.interceptors.request.success(config)
			// 如果没有返回参数，请求不再向下执行
			if (!config) {
				return
			}
			// 正式发送请求
			await this.sendRequest(config).then(requestResponse => {
				let response = {
					statusCode: requestResponse.statusCode,
					config,
					data: requestResponse.data,
					header: requestResponse.header,
					errMsg: requestResponse.errMsg
				}
				// 执行成功的拦截函数，传入请求的结果
				const result = this.interceptors.response.success(response)
				// 有可能会返回Promise.reject，所以要判断是不是Promise
				if (this._checkIsPromise(result)) {
					result.catch(err => {
						reject(err)
					})
				} else {
					resolve(result)
				}
			}).catch(requestError => {
				let error = {
					error: requestError,
					response: {
						statusCode: requestError.statusCode,
						config,
						data: requestError.data,
						header: requestError.header,
						errMsg: requestError.errMsg
					}
				}
				// 执行失败的拦截函数
				const failResult = this.interceptors.response.fail(error)
				if(this._checkIsPromise(failResult)) {
					failResult.catch(err => {
						reject(err)
					})
				}else {
					reject(failResult)
				}
			})
		})
	}

	// 真正发送请求的函数
	sendRequest(config) {
		return new Promise((resolve, reject) => {
			uni.request({
				// 如果是源请求，则不再添加baseURL
				url: (this._checkIsOriginRequest(config.url) ? '' : this.config.baseURL) + config.url,
				method: config.method,
				data: config.data,
				dataType: config.dataType,
				timeout: config.timeout,
				// responseType: config.responseType,
				header: {
					'Content-Type': config.ContentType,
					'Authorization': config.Authorization
				},
				success: (res) => {
					// 404状态码，则让它走fail回调
					if(res.statusCode === 404) {
						reject(res)
						return
					}
					resolve(res)
				},
				fail: (err) => {
					reject(err)
				}
			})
		})
	}

	// get请求
	get(url, data, {
		timeout = this.config.timeout,
		dataType = this.config.dataType,
		responseType = this.config.responseType,
		ContentType = this.config.ContentType,
		Authorization = this.config.Authorization
	} = {}) {
		return this.request(url, data, {
			method: 'GET',
			timeout,
			dataType,
			responseType,
			ContentType,
			Authorization
		})
	}

	// post请求
	post(url, data, {
		timeout = this.config.timeout,
		dataType = this.config.dataType,
		responseType = this.config.responseType,
		ContentType = this.config.ContentType,
		Authorization = this.config.Authorization
	} = {}) {
		return this.request(url, data, {
			method: 'POST',
			timeout,
			dataType,
			responseType,
			ContentType,
			Authorization
		})
	}

	// 检查是否是promise
	_checkIsPromise(obj) {
		if(!obj) {
			return false
		}
		return obj.toString() === '[object Promise]'
	}

	// 检查是否发送原生的请求（包含http://或者https://），如果是，则不走拦截，
	_checkIsOriginRequest(url) {
		return !url.indexOf('http://') || !url.indexOf('https://')
	}
}

export default Axios

