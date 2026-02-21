import type { ReactNode } from 'react'

type Props = {
  toolbar: ReactNode
  sidebar: ReactNode
  children: ReactNode
  statusBar: ReactNode
}

export const AppLayout = ({ toolbar, sidebar, children, statusBar }: Props) => (
  <div className="app-shell">
    <header className="app-shell__toolbar">{toolbar}</header>
    <div className="app-shell__body">
      <aside className="app-shell__sidebar">{sidebar}</aside>
      <main className="app-shell__main">{children}</main>
    </div>
    <footer className="app-shell__status">{statusBar}</footer>
  </div>
)
