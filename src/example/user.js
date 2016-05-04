import EM2 from '../model'

let model = {
    name: 'user',
    url: 'v1/user',
    fields: [
        {
            name: 'name',
            type: 'string',
            default: '',
        }, {
            name: 'age',
            type: 'number',
        },
    ],
}

const User = new EM2(model, {pkey: 'id'})

export default User