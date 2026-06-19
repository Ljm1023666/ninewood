"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Item = {
  id: number
  category: string
  price: number
  rating: number
  stock: number
}

const defaultData: Item[] = [
  { id: 1, category: "Laptop", price: 1200, rating: 4.5, stock: 20 },
  { id: 2, category: "Tablet", price: 600, rating: 4.1, stock: 35 },
  { id: 3, category: "Smartphone", price: 800, rating: 4.7, stock: 50 },
  { id: 4, category: "Monitor", price: 300, rating: 4.0, stock: 15 },
  { id: 5, category: "Laptop", price: 1500, rating: 4.8, stock: 10 },
  { id: 6, category: "Tablet", price: 550, rating: 4.2, stock: 28 },
]

export default function ComparisonTable({ data }: { data?: Item[] }) {
  const items = data ?? defaultData
  const [selected, setSelected] = React.useState<number[]>([])
  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState<string>("all")

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    )
  }

  const resetSelection = () => setSelected([])

  const categories = [...new Set(items.map((i) => i.category))]

  const filteredData = items.filter((item) => {
    const matchesSearch = item.category.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === "all" || item.category === category
    return matchesSearch && matchesCategory
  })

  const comparedItems = items.filter((item) => selected.includes(item.id))

  return (
    <Card className="w-full rounded-none border-0 shadow-none">
      <CardContent className="p-3">
        <h2 className="text-xl font-semibold mb-4">需求对比</h2>
        <div className="flex items-center gap-3 mb-4">
          <Input
            placeholder="搜索标签..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="按标签筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={resetSelection}>重置</Button>
        </div>
        {!search.trim() && category === "all" ? (
          <p className="py-12 text-center text-sm text-text-muted">输入关键词开始搜索</p>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标签</TableHead>
              <TableHead>均价 ¥</TableHead>
              <TableHead>申请数</TableHead>
              <TableHead>库存</TableHead>
              <TableHead>选择</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id} className={cn(selected.includes(item.id) && "bg-muted/50")}>
                <TableCell className="p-2">{item.category}</TableCell>
                <TableCell className="p-2">{item.price}</TableCell>
                <TableCell className="p-2">{item.rating}</TableCell>
                <TableCell className="p-2">{item.stock}</TableCell>
                <TableCell className="p-2">
                  <Button
                    variant={selected.includes(item.id) ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => toggleSelect(item.id)}
                  >
                    {selected.includes(item.id) ? "取消" : "对比"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
        {comparedItems.length === 2 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-medium mb-3">对比结果</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="font-semibold">属性</div>
              <div className="font-semibold">{comparedItems[0].category}</div>
              <div className="font-semibold">{comparedItems[1].category}</div>
              <div>均价 ¥</div>
              <div className={cn(comparedItems[0].price < comparedItems[1].price && "text-green-600")}>{comparedItems[0].price}</div>
              <div className={cn(comparedItems[1].price < comparedItems[0].price && "text-green-600")}>{comparedItems[1].price}</div>
              <div>申请数</div>
              <div className={cn(comparedItems[0].rating > comparedItems[1].rating && "text-green-600")}>{comparedItems[0].rating}</div>
              <div className={cn(comparedItems[1].rating > comparedItems[0].rating && "text-green-600")}>{comparedItems[1].rating}</div>
              <div>库存</div>
              <div className={cn(comparedItems[0].stock > comparedItems[1].stock && "text-green-600")}>{comparedItems[0].stock}</div>
              <div className={cn(comparedItems[1].stock > comparedItems[0].stock && "text-green-600")}>{comparedItems[1].stock}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
