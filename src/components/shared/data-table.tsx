import { Card } from '../ui/card'
import { Table, TBody, TD, TH, THead } from '../ui/table'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
}

export const DataTable = <T,>({ columns, data }: { columns: Column<T>[]; data: T[] }) => (
  <Card className="overflow-x-auto">
    <Table>
      <THead>
        <tr>{columns.map((column) => <TH key={column.key}>{column.header}</TH>)}</tr>
      </THead>
      <TBody>
        {data.map((row, idx) => (
          <tr key={idx} className="hover:bg-slate-900/70">{columns.map((column) => <TD key={column.key}>{column.render(row)}</TD>)}</tr>
        ))}
      </TBody>
    </Table>
  </Card>
)
