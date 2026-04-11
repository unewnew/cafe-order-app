'use client'

import { useEffect, useState } from 'react'
import supabase from '../../lib/supabase'


export default function ResultPage() {
    const [text, setText] = useState('')
    const [copied, setCopied] = useState(false)
    const [timeoutId, setTimeoutId] = useState(null)
    const [alreadySaved, setAlreadySaved] = useState(false)
    const [requestId, setRequestId] = useState(null)

    const themeColor = '#3b82f6' // 모던 블루 그레이

    useEffect(() => {
        document.body.style.opacity = '1'
        document.body.style.filter = 'none'
        document.body.style.backgroundColor = '#f8f9fa'
    }, [])

    useEffect(() => {
        const saved = localStorage.getItem('orderText')
        if (saved) setText(saved)
    }, [])

    useEffect(() => {
        setAlreadySaved(false)
    }, [])

    useEffect(() => {
        let id = localStorage.getItem('requestId')

        if (!id) {
            id = generateUUID()
            localStorage.setItem('requestId', id)
        }

        setRequestId(id)
    }, [])

    async function saveOrder() {
        if (!requestId) return
        if (alreadySaved) return
        const saved = localStorage.getItem('orderDraft')
        if (!saved) return

        const parsed = JSON.parse(saved)

        const { selectedSupplier, selectedItems, quantities } = parsed

        // 1. orders 저장
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([
                {
                    supplier_id: selectedSupplier,
                    request_id: requestId
                }
            ])
            .select()
            .single()

        if (orderError) {
            if (orderError.code === '23505') {
                console.log('이미 저장된 주문 👍')
                setAlreadySaved(true)
                return
            }

            console.log(orderError)
            return
        }

        // 2. order_items 저장
        const orderItemsData = selectedItems.map((id) => ({
            order_id: order.id,
            item_id: id,
            quantity: quantities[id]
        }))

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsData)

        if (itemsError) {
            console.log(itemsError)
            return
        }
        setAlreadySaved(true)
        localStorage.removeItem('requestId')
    }
    function fallbackCopy(text) {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()

        try {
            document.execCommand('copy')
        } catch (err) {
            alert('복사 실패...')
        }

        document.body.removeChild(textarea)
    }

    async function handleCopy(text) {
        await saveOrder()
        localStorage.removeItem('orderDraft')
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true)
                if (timeoutId) clearTimeout(timeoutId)
                const id = setTimeout(() => setCopied(false), 2000)
                setTimeoutId(id)
            })
        } else {
            fallbackCopy(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    async function handleShare(text) {
        await saveOrder()
        localStorage.removeItem('orderDraft')
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
                if (isMobile) setTimeout(() => window.location.href = 'kakaotalk://', 300)
                else alert('모바일에서 카톡 전송이 가능합니다!')
            })
        } else {
            fallbackCopy(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            if (isMobile) setTimeout(() => window.location.href = 'kakaotalk://', 300)
            else alert('모바일에서 카톡 전송이 가능합니다!')
        }
    }



    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID()
        }

        // fallback (구형 브라우저용)
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3 | 0x8)
            return v.toString(16)
        })
    }


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
                    발주서 확인
                </div>
                <div style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                    내용을 확인하고 전송하세요
                </div>
            </div>

            <div style={{ padding: '16px', paddingBottom: '120px' }}>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={12}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '14px',
                        border: '1px solid #ddd',
                        lineHeight: '1.5',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                    }}
                />
                    <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
                    아래 버튼을 누르면 발주가 완료됩니다!<br></br>
                </div>
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
                    onClick={() => handleCopy(text)}
                    onTouchStart={(e) => e.currentTarget.style.opacity = 0.7}
                    onTouchEnd={(e) => e.currentTarget.style.opacity = 1}
                    onMouseDown={(e) => e.currentTarget.style.opacity = 0.7}
                    onMouseUp={(e) => e.currentTarget.style.opacity = 1}
                    style={{
                        flex: 1,
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
                    복사하기
                </button>

                <button
                    onClick={() => handleShare(text)}
                    onTouchStart={(e) => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)' }}
                    onTouchEnd={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)' }}
                    onMouseDown={(e) => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)' }}
                    onMouseUp={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)' }}
                    style={{
                        flex: 1,
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
                    카톡 전송
                </button>
            </div>

            {/* 토스트 */}
            {copied && (
                <div style={{
                    position: 'fixed',
                    bottom: '90px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#333',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '8px'
                }}>
                    복사 완료!
                </div>
            )}
        </div>
    )
}
