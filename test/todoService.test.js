import { describe, it, beforeEach, before, after, afterEach } from 'node:test'
import TodoService from '../src/todoService.js'
import Todo from '../src/todo.js'
import assert from 'node:assert'
import crypto from 'node:crypto'
import sinon from 'sinon'

describe('todoService test Suite', () => {

  describe('#list', () => {

    let _todoService
    let _dependencies

    const mockDatabase = [
      {
        text: 'I must buy bitcoin',
        when: new Date('2020-01-01T00:00:00.000Z'),
        status: 'late',
        id: 'e2ce5eb0-396b-11ee-be56-0242ac120002'
      }
    ]

    beforeEach((context) => {
      _dependencies = {
        todoRepository: {
          list: context.mock.fn(async () => mockDatabase)
        }
      }
      _todoService = new TodoService(_dependencies)
    })

    it('should return a list of items with uppercase text', async () => {

      const expected = mockDatabase.map(({ text, ...result }) => new Todo({ text: text.toUpperCase(), ...result }))

      const result = await _todoService.list()
      assert.deepStrictEqual(result, expected)

      const fnMock = _dependencies.todoRepository.list.mock
      assert.strictEqual(fnMock.callCount(), 1)
    })

  })

  describe('#create', () => {

    let _todoService
    let _dependencies
    let _sandbox

    const mockCreateResult = [
      {
        text: 'I must buy bitcoin',
        when: new Date('2020-01-01T00:00:00.000Z'),
        status: 'late',
        id: 'e2ce5eb0-396b-11ee-be56-0242ac120002'
      }
    ]
    const DEFAUT_ID = mockCreateResult.id

    before(() => {
      crypto.randomUUID = () => DEFAUT_ID
      _sandbox = sinon.createSandbox()
    })

    after(async () => {
      crypto.randomUUID = await import('node:crypto').randomUUID
    })

    beforeEach((context) => {
      _dependencies = {
        todoRepository: {
          create: context.mock.fn(async () => mockCreateResult)
        }
      }
      _todoService = new TodoService(_dependencies)
    })

    afterEach(() => _sandbox.restore())

    it(`shouldn't save todo item with invalid data`, async () => {
      const input = new Todo({
        text: '',
        when: ''
      })
      const expected = {
        error: {
          message: 'invalid data',
          data: {
            text: '',
            when: '',
            status: '',
            id: DEFAUT_ID
          }
        }
      }
      const result = await _todoService.create(input)
      assert.deepStrictEqual(JSON.stringify(result), JSON.stringify(expected))
    })

    it(`should save todo item with late status when the property is further than today`, async () => {
      const properties = {
        text: 'I must play video games',
        when: new Date('2020-12-01 12:00:00 GMT-0')
      }
      const input = new Todo(properties)
      const expected = {
        ...properties,
        status: 'late',
        id: DEFAUT_ID
      }

      const today = new Date('2020-12-02')
      _sandbox.useFakeTimers(today.getTime())

      await _todoService.create(input)

      const fnMock = _dependencies.todoRepository.create.mock
      assert.strictEqual(fnMock.callCount(), 1)
      assert.deepStrictEqual(fnMock.calls[0].arguments[0], expected)
    })

    it(`should save todo item with pending status when the property is in the past`, async () => {
      const properties = {
        text: 'I must play video games',
        when: new Date('2020-12-02 12:00:00 GMT-0')
      }
      const input = new Todo(properties)
      const expected = {
        ...properties,
        status: 'pending',
        id: DEFAUT_ID
      }

      const today = new Date('2020-12-02')
      _sandbox.useFakeTimers(today.getTime())

      await _todoService.create(input)

      const fnMock = _dependencies.todoRepository.create.mock
      assert.strictEqual(fnMock.callCount(), 1)
      assert.deepStrictEqual(fnMock.calls[0].arguments[0], expected)
    })

  })

})