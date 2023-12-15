"use client"

import "@/styles/globals.css"
import { createContext, useCallback, useEffect, useState } from "react"
import {
  fetchFees,
  getBalances,
  getPools,
  trackCCTX,
  // @ts-ignore
} from "@zetachain/toolkit/helpers"
import EventEmitter from "eventemitter3"
import debounce from "lodash/debounce"
import { useAccount } from "wagmi"

import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"

interface RootLayoutProps {
  children: React.ReactNode
}

export const AppContext = createContext<any>(null)

export default function Index({ children }: RootLayoutProps) {
  const [balances, setBalances] = useState<any>([])
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [balancesRefreshing, setBalancesRefreshing] = useState(false)
  const [bitcoinAddress, setBitcoinAddress] = useState("")
  const [fees, setFees] = useState<any>([])
  const [pools, setPools] = useState<any>([])
  const [poolsLoading, setPoolsLoading] = useState(false)

  const { address, isConnected } = useAccount()

  const fetchBalances = useCallback(
    debounce(async (refresh: Boolean = false, btc: any = null) => {
      if (refresh) setBalancesRefreshing(true)
      if (balances.length === 0) setBalancesLoading(true)
      try {
        const b = await getBalances(address, btc)
        setBalances(b)
      } catch (e) {
        console.log(e)
      } finally {
        setBalancesRefreshing(false)
        setBalancesLoading(false)
      }
    }, 500),
    [isConnected, address]
  )

  const fetchFeesList = useCallback(
    debounce(async () => {
      try {
        setFees(await fetchFees(500000))
      } catch (e) {
        console.log(e)
      }
    }, 500),
    []
  )

  const fetchPools = useCallback(
    debounce(async () => {
      setPoolsLoading(true)
      try {
        setPools(await getPools())
      } catch (e) {
        console.log(e)
      } finally {
        setPoolsLoading(false)
      }
    }, 500),
    []
  )

  useEffect(() => {
    fetchBalances(true)
    fetchFeesList()
    fetchPools()
  }, [isConnected, address])

  const [inbounds, setInbounds] = useState<any>([])
  const [cctxs, setCCTXs] = useState<any>([])

  const updateCCTX = (updatedItem: any) => {
    setCCTXs((prevItems: any) => {
      const index = prevItems.findIndex(
        (item: any) => item.inboundHash === updatedItem.inboundHash
      )

      if (index === -1) return prevItems

      const newItems = [...prevItems]
      newItems[index] = {
        ...newItems[index],
        ...updatedItem,
      }

      return newItems
    })
  }

  useEffect(() => {
    const cctxList = cctxs.map((c: any) => c.inboundHash)
    for (let i of inbounds) {
      if (!cctxList.includes(i.inboundHash)) {
        const emitter = new EventEmitter()
        emitter
          .on("search-add", ({ text }) => {
            updateCCTX({
              inboundHash: i.inboundHash,
              progress: text,
              status: "searching",
            })
          })
          .on("add", ({ text }) => {
            updateCCTX({
              inboundHash: i.inboundHash,
              progress: text,
              status: "searching",
            })
          })
          .on("succeed", ({ text }) => {
            updateCCTX({
              inboundHash: i.inboundHash,
              progress: text,
              status: "succeed",
            })
          })
          .on("fail", ({ text }) => {
            updateCCTX({
              inboundHash: i.inboundHash,
              progress: text,
              status: "failed",
            })
          })
          .on("mined-success", (value) => {
            updateCCTX({
              inboundHash: i.inboundHash,
              status: "mined-success",
              ...value,
            })
          })
          .on("mined-fail", (value) => {
            updateCCTX({
              inboundHash: i.inboundHash,
              status: "mined-fail",
              ...value,
            })
          })

        trackCCTX(i.inboundHash, false, emitter)
        setCCTXs([...cctxs, { inboundHash: i.inboundHash, desc: i.desc }])
      }
    }
  }, [inbounds])

  return (
    <>
      <AppContext.Provider
        value={{
          cctxs,
          setCCTXs,
          inbounds,
          setInbounds,
          balances,
          bitcoinAddress,
          setBitcoinAddress,
          setBalances,
          balancesLoading,
          balancesRefreshing,
          fetchBalances,
          fees,
          pools,
          poolsLoading,
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <section className="container px-4 mt-4">{children}</section>
          </div>
        </ThemeProvider>
      </AppContext.Provider>
    </>
  )
}
