import { NavLink } from 'react-router-dom'
import { Compass, Handshake, Orbit } from 'lucide-react'

export default function LoopHubNav() {
  return (
    <nav className="loop-hub-nav" aria-label="回中心">
      <div className="loop-hub-brand">
        <Orbit size={22} />
        <span>回中心</span>
      </div>
      <NavLink to="/loops/discover">
        <Compass size={16} /> 发现回
      </NavLink>
      <NavLink to="/loops/mine">
        <Orbit size={16} /> 我的回
      </NavLink>
      <NavLink to="/loops/accept">
        <Handshake size={16} /> 承接人回
      </NavLink>
    </nav>
  )
}
