import em2 from '../src/model' 

export default new em2({
    name: 'comment',
    url: '/v1/:user_id/comment',
    fields: [
        {
            name: 'nickname',
            type: String,
        }, {
            name: 'content',
            type: String,
            default: 'this is content'
        }, {
            name: 'uid',
        },
        'created_at'
    ]
})
