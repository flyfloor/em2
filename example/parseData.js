const parseData = function(data) {
    let {pkey} = this
    // if (pkey) {
    //     console.log(this.name, '==> pkey ==>', pkey)
    // }
    if (data.code !== 0) {
        console.error('parse wrong =>', data.msg)
        throw(data)
    } else {
        console.info('parse success!')
    }
    return data.res
}

export function exception(error) {
    console.log('custom error =>', error)
    return error
}

export {parseData}
