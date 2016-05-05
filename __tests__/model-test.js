jest.unmock('../src/model')
jest.unmock('../src/example/User')
jest.unmock('../src/example/Post')
jest.unmock('../src/example/Comment')
jest.unmock('../src/model')

import EM2 from "../src/model"

import User from "../src/example/User"
import Post from "../src/example/Post"
import Comment from "../src/example/Comment"

describe('Model wrong', () => {
    it('model object wrong', () => {
        expect(new EM2('a')).toEqual({})
    })
})

describe('Model fields and fieldNames', () => {
    it('user fields shold be right', () => {
        // console.log(User.fields)
        expect(User.fields).toEqual({
            name: {
                type: String,
                default: ''
            },
            age: {
                type: Number,
                default: 0,
            }, 
            gender: {
                type: String,
                default: 'male'
            },
            photos: {
                type: Array,
                default: [],
            },
            social: {
                type: Object,
                default: {}
            }
        })
    })

    it('array fields filled with default type and value', () => {
        expect(Post.fields).toEqual({
            title: {
                type: undefined,
                default: undefined
            },
            content: {
                type: undefined,
                default: undefined
            },
            footer: {
                type: undefined,
                default: undefined
            }
        })
    })

    it('array fields with key pair type fields', () => {
        expect(Comment.fields).toEqual({
            nickname: {
                type: String,
                default: ''
            },
            content: {
                type: String,
                default: 'this is content'
            },
            uid: {
                type: undefined,
                default: undefined
            },
            created_at: {
                type: undefined,
                default: undefined
            }
        })
    })

    it('user field names should be right', () => {
        expect(User.fieldNames).toEqual(['name', 'age', 'gender', 'photos', 'social'])
    })
})

describe('Model fields filled with values', () => {
    it('trim params:right one', () => {
        let params = {
            _id: 1,
            age: 20,
            gender: 'male',
            photos: ['url'],
            name: 'jerry',
            social: {wechat: 'lacuna_fario'}
        }
        expect(EM2.trimParams('user', params)).toEqual(params)
    })

    it('trim params:missing field', () => {
        let params = {
            _id: 1,
            gender: 'male',
            photos: ['url'],
            name: 'jerry',
        }
        expect(EM2.trimParams('user', params)).toEqual({
            _id: 1,
            age: 0,
            gender: 'male',
            photos: ['url'],
            name: 'jerry',
            social: {},
        })
    })

    it('trim params:no type field', () => {
        let params = {
            _id: 1,
            age: 0,
            title: 'title',
            photos: ['url'],
            content: {}
        }
        // console.log(EM2.trimParams('post', params))
        expect(EM2.trimParams('post', params)).toEqual({
            _id: 1,
            age: 0,
            title: 'title',
            photos: ['url'],
            content: {}
        })
    })
    it('trim params:wrong type field', () => {
        let params = {
            _id: 1,
            age: 0,
            nickname: 'nickname',
            photos: ['url'],
            uid: {},
            content: {}
        }

        expect(EM2.trimParams('comment', params)).toEqual({
            _id: 1,
            age: 0,
            nickname: 'nickname',
            photos: ['url'],
            uid: {},
            content: 'this is content'
        })
    })
})
