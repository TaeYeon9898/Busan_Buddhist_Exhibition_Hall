'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [stockData, setStockData] = useState([])
  const [inData, setInData] = useState([])
  const [outData, setOutData] = useState([])
  const [returnData, setReturnData] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stock')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: stock } = await supabase
      .from('product_info')
      .select('*')
      .order('code')

    const { data: inStock } = await supabase
      .from('in_stock')
      .select('*')
      .order('order_date', { ascending: false })
      .limit(50)

    const { data: outStock } = await supabase
      .from('out_stock')
      .select('*')
      .order('out_date', { ascending: false })
      .limit(50)

    const { data: returnStock } = await supabase
      .from('return_stock')
      .select('*')
      .order('return_date', { ascending: false })
      .limit(50)

    setStockData(stock || [])
    setInData(inStock || [])
    setOutData(outStock || [])
    setReturnData(returnStock || [])
    setLoading(false)
  }

  if (loading) return <div className="p-8">로딩 중...</div>

  const tabs = [
    { id: 'stock', label: '재고 현황' },
    { id: 'in', label: '입고 내역' },
    { id: 'out', label: '출고 내역' },
    { id: 'return', label: '반품 내역' },
  ]

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-8">재고 대시보드</h1>

      {/* 탭 */}
      <div className="flex border-b border-gray-300 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 재고 현황 */}
      {activeTab === 'stock' && (
        <section>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">거래처</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">보유재고</th>
                  <th className="border border-gray-300 p-2">입고합계</th>
                  <th className="border border-gray-300 p-2">출고합계</th>
                  <th className="border border-gray-300 p-2">반품합계</th>
                </tr>
              </thead>
              <tbody>
                {stockData.map((item: any) => (
                  <tr key={item.id} className={item.current_stock <= item.alarm_qty ? 'bg-red-50' : ''}>
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.supplier}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{item.current_stock}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.in_total}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.out_total}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.return_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 입고 내역 */}
      {activeTab === 'in' && (
        <section>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">주문날짜</th>
                  <th className="border border-gray-300 p-2">입고번호</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">거래처</th>
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">주문수량</th>
                  <th className="border border-gray-300 p-2">입고수량</th>
                  <th className="border border-gray-300 p-2">미입고수량</th>
                </tr>
              </thead>
              <tbody>
                {inData.map((item: any) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-2">{item.order_date}</td>
                    <td className="border border-gray-300 p-2">{item.in_number}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.supplier}</td>
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.order_qty}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.in_qty}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.pending_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 출고 내역 */}
      {activeTab === 'out' && (
        <section>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">출고날짜</th>
                  <th className="border border-gray-300 p-2">출고번호</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">출고수량</th>
                  <th className="border border-gray-300 p-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {outData.map((item: any) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-2">{item.out_date}</td>
                    <td className="border border-gray-300 p-2">{item.out_number}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.out_qty}</td>
                    <td className="border border-gray-300 p-2">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 반품 내역 */}
      {activeTab === 'return' && (
        <section>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">반품날짜</th>
                  <th className="border border-gray-300 p-2">반품번호</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">반품수량</th>
                  <th className="border border-gray-300 p-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {returnData.map((item: any) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-2">{item.return_date}</td>
                    <td className="border border-gray-300 p-2">{item.return_number}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.return_qty}</td>
                    <td className="border border-gray-300 p-2">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}