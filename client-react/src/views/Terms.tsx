import { BackButton } from '@/components/ui/back-button'

export default function Terms() {
  return (
    <div className="relative z-base flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto bg-bg-primary px-6 py-8">
      <BackButton />
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-extrabold text-text-primary mb-6">
          服务条款
        </h1>
        <div className="space-y-5 text-sm text-text-secondary leading-relaxed">
          <p>最后更新：2026-05-23</p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            1. 服务说明
          </h2>
          <p>
            九木平台（以下简称&ldquo;本平台&rdquo;）是一个连接服务需求方与服务提供方的中介平台。用户可在本平台发布需求、接单、完成交易。
          </p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            2. 用户账户
          </h2>
          <p>
            用户注册时需提供真实有效的手机号码。每个手机号码仅限注册一个账户。用户应妥善保管账户密码，因账户密码泄露导致的损失由用户自行承担。
          </p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            3. 平台规则
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>禁止发布违法违规内容</li>
            <li>禁止恶意刷单、虚假交易</li>
            <li>禁止在平台外私下交易</li>
            <li>禁止骚扰、辱骂其他用户</li>
            <li>禁止使用外挂、自动化脚本操作平台</li>
          </ul>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            4. 交易规则
          </h2>
          <p>
            本平台采用担保交易模式。需求方发布需求后，服务方申请接单。双方确认后进入执行阶段。完成验收后资金解冻给服务方。如发生争议，平台有权介入协调。
          </p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            5. 费用与税收
          </h2>
          <p>
            平台可能对成功交易收取服务费，具体费率以平台公示为准。用户应自行承担因使用平台服务产生的税费。
          </p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            6. 免责声明
          </h2>
          <p>
            本平台仅作为信息中介，不对用户之间的交易结果承担责任。用户应自行判断交易风险。平台尽力保障服务稳定性，但不对不可抗力（如自然灾害、网络攻击）导致的服务中断承担责任。
          </p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            7. 条款变更
          </h2>
          <p>
            本平台有权随时修改服务条款，修改后的条款一经发布即生效。用户继续使用平台服务即视为接受修改后的条款。
          </p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            8. 法律适用
          </h2>
          <p>
            本条款适用中华人民共和国法律。因本条款引起的争议，双方应友好协商解决；协商不成的，提交平台所在地有管辖权的人民法院诉讼解决。
          </p>
        </div>
      </div>
    </div>
  )
}
