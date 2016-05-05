import EM2 from '../model'

let model = {
    name: 'user',
    url: 'v1/user',
    fields: {
        name: {
            type: String,
            default: '',
        },
        age: {
            type: Number,
        },
        sex: {
            type: String,
            default: 'male'
        }
    }
}

const User = new EM2(model, {pkey: 'id'})

export default User