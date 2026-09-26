import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initialInventoryState } from '../data/mockData'
import { inventoryEngine } from '../services/inventoryEngine'
import { inventoryRepository } from '../services/inventoryRepository'
import { receiptService } from '../services/receiptService'
import { resetState } from '../services/store'

describe('inventory mutation architecture', () => {
  beforeEach(() => resetState())

  it('routes service mutations through the inventory engine', async () => {
    const engineCall = vi.spyOn(inventoryEngine, 'createReceipt')
    const receipt = initialInventoryState.receipts[0]

    await receiptService.createReceipt({ ...receipt, id: undefined } as never)

    expect(engineCall).toHaveBeenCalledOnce()
    expect(engineCall.mock.calls[0][0]).toMatchObject({ receiptNumber: receipt.receiptNumber })
  })

  it('routes engine mutations through the repository transaction boundary in test mode', async () => {
    const repositoryCall = vi.spyOn(inventoryRepository, 'transact')
    const receipt = { ...initialInventoryState.receipts[0], id: 'architecture-receipt' }

    await inventoryEngine.createReceipt(receipt)

    expect(repositoryCall).toHaveBeenCalledOnce()
    expect(inventoryRepository.snapshot().receipts[0].id).toBe(receipt.id)
  })
})
