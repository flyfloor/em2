import em2 from '../src/model' 
import parseData from './parseData'

export default new em2({
    name: 'post',
    url: '/v1/post',
    fields: ['title', 'content', 'footer'],
}, {parseData})