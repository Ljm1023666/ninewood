export default function Privacy() {
  return (
    <div className="relative z-base flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto bg-bg-primary px-6 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-extrabold text-text-primary mb-6">
          隐私政策
        </h1>
        <div className="space-y-5 text-sm text-text-secondary leading-relaxed">
          <p>最后更新：2026-05-23</p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            1. 信息收集
          </h2>
          <p>
            我们收集您在使用九木平台时主动提供的个人信息，包括但不限于：手机号码、昵称、头像、个人简介。上述信息仅在您注册账号、发布需求、进行交易等服务场景中收集。
          </p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            2. 信息使用
          </h2>
          <p>您的个人信息用于以下目的：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>创建和维护您的账户</li>
            <li>处理和完成交易</li>
            <li>改善平台服务和用户体验</li>
            <li>发送服务相关的通知和更新</li>
          </ul>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            3. 信息保护
          </h2>
          <p>
            我们采取行业标准的安全措施保护您的个人信息，包括加密传输、访问控制、定期安全审计等。但请注意，互联网上的数据传输不能保证
            100% 的安全。
          </p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            4. 信息共享
          </h2>
          <p>
            我们不会将您的个人信息出售给第三方。在以下情况下，我们可能会共享您的信息：
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>获得您的明确同意</li>
            <li>法律要求或政府机关指令</li>
            <li>保护平台用户的权利和财产安全</li>
          </ul>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            5. 用户权利
          </h2>
          <p>
            您有权：查看、修改、删除您的个人信息；注销您的账户；撤回同意。您可以在「设置」页面中进行上述操作。
          </p>

          <h2 className="text-lg font-bold text-text-primary mt-8">
            6. 联系我们
          </h2>
          <p>如有隐私相关的疑问或投诉，请通过平台内消息系统联系客服。</p>
        </div>
      </div>
    </div>
  )
}
