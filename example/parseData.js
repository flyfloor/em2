export default function(data){
    let {pkey} = this
    if (pkey) {
        console.log('pkey ==>', pkey)
    }
    if (data.code !== 0) {
        console.error('server wrong', data.msg)
    } else {
        console.info('ok')
    }
    return data.res
}
