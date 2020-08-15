import httpInstance from "./interceptor"

httpInstance.post('/user/login',{
    email: '1532917281@qq.com',
	password: '123456' // success
	// password: '1234567' // fail
}).then(res => {
	console.log('请求响应后的数据')
	console.log(res)
}).catch(err => {
	console.log('catch捕捉的数据')
	console.log(err)
})
