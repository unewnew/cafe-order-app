'use client'

import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'


export default function Home() {
  const router = useRouter()
  const inputRefs = useRef({})
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [quantities, setQuantities] = useState({})
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [checkedItems, setCheckedItems] = useState([])
  const [loading, setLoading] = useState(true)
  const isFirstLoad = useRef(true)
  const [search, setSearch] = useState('')
  const [itemStats, setItemStats] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    getData()
  }, [])
  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast('')
    }, 2000)

    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!selectedSupplier) return

    getItemStats()
  }, [selectedSupplier])

  async function getData() {
    setLoading(true)

    const [supRes, itemRes] = await Promise.all([
      supabase
        .from('suppliers')
        .select('id, name'),
      supabase
        .from('items')
        .select('id, name, supplier_id, unit')
    ])

    if (supRes.error) {
      console.log(supRes.error)
      alert('데이터를 불러오지 못했습니다...')
    }
    else setSuppliers(supRes.data)

    if (itemRes.error) {
      console.log(itemRes.error)
      alert('품목 데이터를 불러오지 못했습니다...')
    }
    else setItems(itemRes.data)

    setLoading(false)
  }

  async function getItemStats() {
    const { data, error } = await supabase.rpc('get_item_order_stats', {
      supplier_id_param: selectedSupplier
    })

    if (error) {
      console.log(error)
      alert('통계 데이터를 불러오지 못했습니다...')
      return
    }

    const map = Object.fromEntries(
      (data || []).map(i => [i.item_id, i.total_qty])
    )

    setItemStats(map)
  }

  const prevSupplierRef = useRef(null)

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      prevSupplierRef.current = selectedSupplier
      return
    }

    if (
      prevSupplierRef.current &&
      prevSupplierRef.current !== selectedSupplier
    ) {
      setSelectedItems([])
      setQuantities({})
      setCheckedItems([])
    }

    prevSupplierRef.current = selectedSupplier
  }, [selectedSupplier])


  function handleCheck(item) {
    setCheckedItems((prev) => {
      const isChecked = prev.includes(item.id)

      if (isChecked) {
        // 체크 해제

        setSelectedItems((prevSelected) =>
          prevSelected.filter((id) => id !== item.id)
        )

        setQuantities((prevQty) => {
          const newQty = { ...prevQty }
          delete newQty[item.id]
          return newQty
        })

        return prev.filter((id) => id !== item.id)
      } else {
        requestAnimationFrame(() => {
          inputRefs.current[item.id]?.focus()
        })
        return [...prev, item.id]
      }
    })
  }

  const handleComplete = (id) => {
    if (!quantities[id]) return

    setSelectedItems((prev) => {
      if (!prev.includes(id)) {
        return [...prev, id]
      }
      return prev
    })
  }

  const filteredItems = items.filter(
    (item) =>
      item.supplier_id === selectedSupplier &&
      item.name.toLowerCase().includes(search.toLowerCase())
  )

  const supplierName = suppliers.find(
    (s) => s.id === selectedSupplier
  )?.name || ''

  function generateText() {
    const missingItem = checkedItems.find(
      (id) => !quantities[id] || quantities[id] === ''
    )

    if (missingItem) {
      const item = items.find(i => i.id === missingItem)

      alert('선택한 품목의 수량을 입력해주세요!')

      setTimeout(() => {
        inputRefs.current[missingItem]?.focus()
      }, 100)

      return
    }

    const itemMap = Object.fromEntries(items.map(i => [i.id, i]))
    const today = new Date()
    const formattedDate = `${today.getFullYear()}/${String(
      today.getMonth() + 1
    ).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`

    let text = `${formattedDate} ${supplierName} 발주\n\n`

    const sortedItems = [...selectedItems].sort((a, b) => {
      return itemMap[a].name.localeCompare(itemMap[b].name)
    })

    sortedItems.forEach((id) => {
      const item = itemMap[id]
      if (!item) return

      const qty = quantities[id]
      if (!qty) return

      text += `-${item.name} ${qty}${item.unit}\n`
    })

    if (supplierName === '공주엔엔아이') {
      text += `\n발주요청드립니다. 감사합니다`
    } else {
      text += `\n모든 제품 최신 날짜로 부탁드립니다.\n감사합니다!`
    }

    localStorage.setItem('orderText', text)
    router.push('/resultPage')
  }

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aSelected = selectedItems.includes(a.id)
    const bSelected = selectedItems.includes(b.id)

    // 1순위: 선택된 항목 
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1

    // 2순위: 많이 주문된 순
    const aCount = itemStats[a.id] || 0
    const bCount = itemStats[b.id] || 0

    if (aCount !== bCount) return bCount - aCount

    // 3순위: 이름
    return a.name.localeCompare(b.name)
  })

  const isLoaded = useRef(false)

  useEffect(() => {
    if (items.length === 0) return

    const saved = localStorage.getItem('orderDraft')
    if (saved) {
      const parsed = JSON.parse(saved)

      setSelectedSupplier(parsed.selectedSupplier || '')
      setSelectedItems(parsed.selectedItems || [])
      setQuantities(parsed.quantities || {})
      setCheckedItems(parsed.checkedItems || [])
    }

    isLoaded.current = true
  }, [items])

  useEffect(() => {
    if (!isLoaded.current) return  // 👈 이거 핵심

    const draft = {
      selectedSupplier,
      selectedItems,
      quantities,
      checkedItems
    }

    localStorage.setItem('orderDraft', JSON.stringify(draft))
  }, [selectedSupplier, selectedItems, quantities, checkedItems])
  useEffect(() => {
    document.body.style.backgroundColor = '#f8f9fa'
    document.body.style.opacity = '1'
  }, [])
  const themeColor = '#3b82f6' // 모던 블루 그레이

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      opacity: 1,
      filter: 'none'
    }}>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          backgroundColor: themeColor,
          color: 'white',
          textAlign: 'center',
          padding: '20px',
          fontSize: '14px',
          zIndex: 999,
          boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
        }}>
          불러오는 중...<br></br>
          지속되면 새로고침 해주세요.<br></br>
          미아냉 ㅎㅎ 무료 서버라서 그랭 ㅎㅎ
        </div>
      )}
      <div style={{ fontSize: '18px', fontWeight: '600', color: '#111' }}>
        <div style={{
          backgroundColor: 'white',
          paddingTop: '30px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
          boxShadow: '0 6px 16px rgba(0,0,0,0.06)',

        }}>

          <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: '600' }}>
            BNZ 기장점 발주
          </div>
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '4px' }}>
            업체와 품목을 선택하세요
          </div>
        </div>

        {/* 업체 선택 */}
        <div style={{ padding: '16px 16px 0 20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#111' }}>
              업체 선택
            </div>

            <button
              onClick={() => router.push('/ordersPage')}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              발주목록 📋
            </button>
          </div>
          <div style={{ padding: '0 16px 16px' }}>

            {suppliers.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedSupplier(s.id)}
                style={{
                  fontSize: '15px',
                  padding: '14px',
                  marginBottom: '10px',
                  borderRadius: '14px',
                  backgroundColor: 'white',
                  border: selectedSupplier === s.id
                    ? `2px solid ${themeColor}`
                    : '1px solid #eee',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                  cursor: 'pointer'
                }}
              >
                {s.name}
              </div>
            ))}
          </div>
        </div>

        {/* 품목 선택 */}
        <div style={{ padding: '0 16px calc(5px + env(safe-area-inset-bottom)) 20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{ fontWeight: 'bold' }}>
              품목 선택
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '160px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  transform: 'scale(0.8)',
                  transformOrigin: 'right center',
                }}
              />

              {search && (
                <span
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✖️
                </span>
              )}
            </div>
          </div>
          <div style={{ padding: '0 16px 120px' }}>
            <div style={{ marginBottom: '5px', color: '#888', fontSize: '14px' }}>

            </div>

            <div>
              {sortedItems.map(item => {
                const isChecked = checkedItems.includes(item.id)
                const isSelected = selectedItems.includes(item.id)

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCheck(item)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '15px',
                      backgroundColor: 'white',
                      border: isSelected
                        ? `2px solid ${themeColor}` // 입력 완료
                        : isChecked
                          ? `1.5px solid ${themeColor}` // 선택만
                          : '1px solid #ddd',
                      padding: '12px',
                      marginBottom: '10px',
                      borderRadius: '14px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{item.name}</span>

                    {isChecked && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <input
                          ref={(el) => (inputRefs.current[item.id] = el)}
                          type="number"
                          placeholder="수량"
                          value={quantities[item.id] || ''}
                          onChange={(e) =>
                            setQuantities({ ...quantities, [item.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleComplete(item.id)
                            }
                          }}
                          onBlur={() => handleComplete(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '45px',
                            textAlign: 'center',
                            padding: '3px',
                            borderRadius: '6px',
                            border: '1px solid #ddd',
                            fontSize: '16px'
                          }}
                        />
                        <span style={{ fontSize: '13px', color: '#555' }}>
                          {item.unit}
                        </span>
                      </div>
                    )}

                    {!isChecked && (
                      <span style={{ color: '#888', fontSize: '13px' }}>
                        {item.unit}
                      </span>
                    )}
                  </div>
                )
              })}
              {sortedItems.length === 0 && (
                <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
                  결과 없음!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 발주서 생성 버튼 */}
        {toast && (
          <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#111',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 1000,
            opacity: 0.9
          }}>
            {toast}
          </div>
        )}
        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', padding: '16px', backgroundColor: '#f8f9fa' }}>
          <button
            onClick={() => {
              setToast('얍!')
              if (selectedItems.length === 0) return
              generateText()
            }}
            onTouchStart={(e) => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)' }}
            onTouchEnd={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)' }}
            onMouseDown={(e) => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)' }}
            onMouseUp={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)' }}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: selectedItems.length === 0 ? '#ccc' : themeColor,
              opacity: selectedItems.length === 0 ? 0.6 : 1,
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
            }}
          >
            발주서 생성
          </button>
        </div>
      </div>
    </div>
  );
}