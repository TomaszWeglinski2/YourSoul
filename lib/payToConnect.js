export function isPayToConnectEnabled() {
  return process.env.NEXT_PUBLIC_PAY_TO_CONNECT !== "0";
}

export const PAY_TO_CONNECT_STUB_PRICE = "12 zł";
