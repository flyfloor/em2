export function parseData(data){
    let {pkey} = this
    if (pkey) {
        console.log(this.name, '==> pkey ==>', pkey)
    }
    if (data.code !== 0) {
        console.error('server wrong', data.msg)
    } else {
        console.info('ok')
    }
    return data.res
}

export function exception(error) {
    console.log('custom error handler ==>', error)
}
