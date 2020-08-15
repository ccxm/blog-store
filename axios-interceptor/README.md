**前言：** axios是一个功能强大的网络请求库，其中拦截器又是axios的精髓。在小程序的开发或者需要手动实现ajax的时候，没有实现对请求的拦截，开发的时候非常不方便，因此手写一个简易版的axios拦截器。

## 拦截器的实现
#### 1、实现思路
> * 1、实现一个通用的请求request函数，所有请求都调用这个函数去进行网络请求
> * 2、请求调用request函数
> * 3、在正式发送请求前，执行请求前beforeRequest拦截函数
> * 4、拿到beforeRequest的返回值，其返回值是修改后的请求参数config
> * 5、正式发送请求
> * 6、在请求响应后，执行beforeResponse函数，其返回值是对response数据处理后的值
> * 7、request正式返回，请求结束

#### 2、简易版axios的结构
根据实现思路得出的axios的结构
```javascript
class Axios {
    constructor() {
        // 定义拦截器对象
        this.interceptors = {}
        // 默认的配置文件
        this.config = {}
    }

    // axios的初始化函数，初始化时对config进行赋值
    static create(){}

    // 请求发送前的拦截函数
    beforeRequest() {}

    // 请求响应的拦截函数
    beforeResponse() {}

    // 通用的request函数
    async request() {}

    // 真正发送请求的函数
    sendRequest(config) {}

    // get请求
    get(){}

    // post请求
    post(){}
    
}

export default Axios
```
为了实现方便，我把axios声明为一个class，里面主要实现了几个关键函数：`create`、`beforeRequest`、`beforeResponse`、`request`、`sendRequest`。其中请求方法大家可以根据需求加，我这里列了两个常用的，`get`、`post`。

#### 3、具体函数的实现
##### `1、this.interceptors`

```javascript
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
```
拦截器对象，对象里面包括了两个对象，`request`、`response`，其中`use`就是调用拦截器的使用函数，如

```javascript
axios.interceptors.request.use()
axios.interceptors.response.use()
```
##### `2、this.config`
默认的配置文件
```javascript
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
```

##### `3、create`
axios的初始化函数，对默认参数进行合并并返回一个axios实例。之所以使用静态方法，是因为使用的时候不要再new一个实例，直接调用`Axios.create`
```javascript
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
```
**注：** 这个axios请求里面大量使用了ES6的默认参数填充，为的是打代码时有提示，因此代码量会有一定的冗余，效果如下。
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200815171200499.gif#pic_center)


##### `4、beforeRequest、beforeResponse`
```javascript
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
```
拦截器自定义的实现函数，当使用`axios.interceptors.request.use()`的时候，会向该函数传入两个函数，`success`和`error`，分别放到request的`success`和`error`函数里面，在请求前，就会调用`success`，得到配置参数`config`。这就是拦截器的实现思路。response的原理也类似

##### `5、request的关键代码`

```javascript
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
```
就是在请求和响应前分别调用`interceptors`里的函数，成功是调用`success`，失败时调用`error`

##### `6、sendRequest`
```javascript
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
```
这里是发送请求的函数，其中`uni.request`可换成`wx.request`或其他的`ajax`请求
##### `7、get`
```javascript
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
```
其他请求也类似

##### `8、interceptors.js`

```javascript
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

```
使用拦截器的代码，这里和原生的axios是一样的，其中更多逻辑可自己加入。

#### 4、使用样例

```javascript
import httpInstance from "./interceptor"

httpInstance.post('/user/login',{
    email: '1532917281@qq.com',
	password: '1234567'
}).then(res => {
	console.log('请求响应后的数据')
	console.log(res)
}).catch(err => {
	console.log('catch捕捉的数据')
	console.log(err)
})
```
使用也和原生的axios是一样的，效果截图如下。

**请求成功的截图，code=10000**
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200815171637448.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzM5ODUxODg4,size_16,color_FFFFFF,t_70#pic_center)

**请求失败的截图**
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200815171710245.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzM5ODUxODg4,size_16,color_FFFFFF,t_70#pic_center)


**注：** 本套代码是基于`uni-app`实现的，在微信小程序中只需将uni.request换成`wx.reques`t即可。以上的实现过程还是比较粗糙的，如果有什么疑问或不懂的欢迎留言。
