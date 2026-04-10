'use client'

import { useEffect, useState } from 'react'
import supabase from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function OrdersPage() {
    const router = useRouter()
    const [orders, setOrders] = useState([])
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)

    const themeColor = '#3b82f6' // 모던 블루 그레이


    useEffect(() => {
        getOrders()
    }, [])

    useEffect(() => {
        let timeout

        function handleScroll() {
            if (timeout) return

            timeout = setTimeout(() => {
                const bottom =
                    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100

                if (bottom) {
                    getOrders()
                }

                timeout = null
            }, 200)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [page, loading, hasMore])



    async function getOrders() {
        if (loading || !hasMore) return

        setLoading(true)

        const from = page * 10
        const to = from + 9

        const { data, error } = await supabase
            .from('orders')
            .select(`
      id,
      created_at,
      suppliers ( name ),
      order_items (
        quantity,
        items ( name, unit )
      )
    `)
            .order('created_at', { ascending: false })
            .range(from, to)

        if (!error && data) {

            // ✅ 데이터 끝 체크 (핵심)
            if (data.length < 10) {
                setHasMore(false)
            }

            // ✅ 중복 제거
            setOrders(prev => {
                const newData = data.filter(
                    newItem => !prev.some(prevItem => prevItem.id === newItem.id)
                )
                return [...prev, ...newData]
            })

            setPage(prev => prev + 1)
        }

        setLoading(false)
    }

    function formatDate(dateString) {
        const date = new Date(dateString)
        const now = new Date()

        const diffTime = now - date
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

        if (diffDays === 0) return '오늘'
        if (diffDays === 1) return '어제'
        if (diffDays < 7) return days[date.getDay()]

        return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
    }
    useEffect(() => {
        document.body.style.opacity = '1'
        document.body.style.filter = 'none'
        document.body.style.backgroundColor = '#f8f9fa'
    }, [])
    return (
        <div style={{
            backgroundColor: '#f8f9fa',
            minHeight: '100vh',
            opacity: 1,
            filter: 'none',
            color: '#111'
        }}>
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
                <div style={{ fontSize: '20px', fontWeight: '600', textAlign: 'center' }}>
                    발주목록
                </div>
                <div style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                    발주처별 최신순으로 보여집니다.
                </div>
            </div>

            <div style={{ padding: '16px', paddingBottom: '120px' }}>
                {orders.map((order) => (
                    <div key={order.id} style={{
                        background: 'white',
                        padding: '16px',
                        marginBottom: '14px',
                        borderRadius: '14px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                    }}>
                        {/* 상단: 업체 + 날짜 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: '600' }}>
                                {order.suppliers?.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#888' }}>
                                {formatDate(order.created_at)}
                            </div>
                        </div>

                        {/* 구분선 */}
                        <div style={{
                            height: '1px',
                            background: '#eee',
                            margin: '10px 0'
                        }} />

                        {/* 발주 아이템 리스트 */}
                        <div>
                            {order.order_items?.map((item, idx) => (
                                <div key={item.id || idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '14px',
                                    marginBottom: '4px'
                                }}>
                                    <span>{item.items?.name}</span>
                                    <span>
                                        {item.quantity} {item.items?.unit}
                                    </span>
                                </div>
                            ))}

                        </div>

                    </div>

                ))}
                {!hasMore && (
                    <div style={{
                        textAlign: 'center',
                        color: '#888',
                        fontSize: '13px',
                        marginTop: '20px'
                    }}>
                        마지막 발주입니다 🙂
                    </div>
                )}
            </div>

            {/* 하단 고정 버튼 */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '100%',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                gap: '10px'
            }}>
                <button
                    onClick={() => router.push('/')}
                    style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: themeColor,
                        color: 'white',
                        border: 'none',
                        borderRadius: '14px',
                        fontSize: '16px',
                        fontWeight: '600',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                    }}
                >
                    메인으로 돌아가기
                </button>
            </div>


        </div>



    )
}