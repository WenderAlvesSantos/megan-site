import type { StatusCliente } from './apiAdmin'
import { STATUS } from './formato'

export default function SeloStatus({ status }: { status: StatusCliente }) {
  const { rotulo, cor } = STATUS[status]
  return (
    <span className="selo" style={{ color: cor, background: `${cor}1f`, borderColor: `${cor}55` }}>
      {rotulo}
    </span>
  )
}
