import Ajv, { type ErrorObject } from 'ajv'

const ajv = new Ajv({ allErrors: true, strict: false })

function hasSchema(schema: unknown): schema is Record<string, unknown> {
  return Boolean(schema && typeof schema === 'object' && Object.keys(schema as object).length)
}

function describeErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.message ?? '不符合契约'}`)
    .join('；')
}

export function assertLoopSchema(
  schema: unknown,
  value: unknown,
  label: '输入' | '输出',
): void {
  if (!hasSchema(schema)) return
  const validate = ajv.compile(schema)
  if (validate(value)) return
  throw Object.assign(new Error(`${label}不符合回契约：${describeErrors(validate.errors)}`), {
    status: 422,
    code: label === '输入' ? 'LOOP_INPUT_INVALID' : 'LOOP_OUTCOME_INVALID',
    details: validate.errors,
  })
}
