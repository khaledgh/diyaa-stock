import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { value: string; label: string }[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
  onSearchChange?: (search: string) => void
  /** Show a small "x" to clear the selection. */
  clearable?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  emptyText = "No option found.",
  searchPlaceholder = "Search...",
  className,
  disabled = false,
  onSearchChange,
  clearable = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // An option whose value is "" (or "0") is a placeholder row, not a real choice.
  const selectedOption = options.find((option) => option.value === value && option.value !== "")
  const realOptions = options.filter((option) => option.value !== "")

  const handleSearchChange = (next: string) => {
    setSearch(next)
    onSearchChange?.(next)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next && search) handleSearchChange("")
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "group flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-start text-sm transition-colors",
            "hover:border-ring/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            open && "border-ring ring-2 ring-ring/30",
            className
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selectedOption && "text-muted-foreground")} dir="auto">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {clearable && selectedOption && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[max(var(--radix-popover-trigger-width),14rem)] p-0" align="start">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={handleSearchChange} />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup className="scroll-thin max-h-64 overflow-auto">
            {realOptions.map((option, index) => {
              const selected = value === option.value
              return (
                <CommandItem
                  key={`${option.value}-${index}`}
                  value={`${option.value}::${option.label}`}
                  onSelect={(selectedValue: string) => {
                    const actualValue = selectedValue.split("::")[0]
                    onChange(actualValue === value ? "" : actualValue)
                    setOpen(false)
                  }}
                  className={cn(selected && "font-medium text-primary")}
                >
                  <span className="min-w-0 flex-1 truncate" dir="auto">{option.label}</span>
                  <Check className={cn("h-4 w-4 shrink-0 text-primary", selected ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
