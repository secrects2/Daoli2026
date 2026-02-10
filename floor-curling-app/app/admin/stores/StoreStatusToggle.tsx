'use client'

import { useTransition } from 'react'
import { toggleStoreStatus } from './actions'

import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ConfirmContext'

interface Props {
    storeId: string
    currentStatus: string
}

export function StoreStatusToggle({ storeId, currentStatus }: Props) {
    const [isPending, startTransition] = useTransition()
    const { confirm } = useConfirm()
    const isActive = currentStatus === 'active'

    const handleToggle = async () => {
        if (!await confirm({
            message: `確定要${isActive ? '停權 (Suspend)' : '啟用 (Activate)'} 此加盟店嗎？\n\n注意：停權後，該店所有藥師將無法提交比賽成績。`,
            variant: 'danger'
        })) {
            return
        }

        startTransition(async () => {
            try {
                await toggleStoreStatus(storeId, currentStatus)
            } catch (error: any) {
                toast.error(`操作失敗: ${error.message}`)
            }
        })
    }

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            className={`
                relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                ${isActive ? 'bg-green-600' : 'bg-gray-200'}
                ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            role="switch"
            aria-checked={isActive}
        >
            <span className="sr-only">Toggle store status</span>
            <span
                aria-hidden="true"
                className={`
                    pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
                    ${isActive ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    )
}
