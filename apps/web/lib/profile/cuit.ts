export function normalizarCuit(value: string): string {
  return value.replace(/\D/g, "")
}

export function esCuitValido(value: string): boolean {
  const cuit = normalizarCuit(value)
  if (!/^\d{11}$/.test(cuit)) return false

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((total, peso, index) => total + Number(cuit[index]) * peso, 0)
  const resto = 11 - (suma % 11)
  const digito = resto === 11 ? 0 : resto === 10 ? 9 : resto
  return digito === Number(cuit[10])
}

export function formatearCuit(value: string | null): string {
  const cuit = value ? normalizarCuit(value) : ""
  return cuit.length === 11 ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit[10]}` : value ?? ""
}
