import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  useState,
  type DragEvent,
} from 'react'
import {
  deleteProductImage,
  reorderProductImages,
  updateProductImage,
  uploadProductImages,
} from '../../api/admin'
import type { Product, ProductImage } from '../../types/product'
import { cn } from '../../utils/cn'
import { errorMessage } from '../../utils/errors'
import { fallbackProductImageUrl } from '../../utils/productImages'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const maxProductImages = 10
const maxImageBytes = 4 * 1024 * 1024
const acceptedImageTypes = new Set(['image/jpeg', 'image/png'])
const fieldClass =
  'h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

type PendingFile = {
  file: File
  previewUrl: string
}

type ProductImageManagerProps = {
  product: Product
  onImagesChange(images: ProductImage[]): void
}

function primaryImageUrl(images: ProductImage[]): string {
  return (images.find((image) => image.isPrimary) ?? images[0])?.url ?? ''
}

function validateFiles(files: File[], remainingSlots: number): { files: File[]; error?: string } {
  if (files.length === 0) {
    return { files: [] }
  }
  if (files.length > remainingSlots) {
    return {
      files: files.slice(0, Math.max(remainingSlots, 0)),
      error: `A product can have at most ${maxProductImages} images.`,
    }
  }

  const invalidType = files.find((file) => !acceptedImageTypes.has(file.type))
  if (invalidType) {
    return { files: [], error: 'Only JPG and PNG images are accepted.' }
  }

  const oversized = files.find((file) => file.size > maxImageBytes)
  if (oversized) {
    return { files: [], error: 'Each image must be 4 MiB or smaller.' }
  }

  return { files }
}

export function ProductImageManager({
  product,
  onImagesChange,
}: ProductImageManagerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pendingFilesRef = useRef<PendingFile[]>([])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [draftAltText, setDraftAltText] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [busyImageId, setBusyImageId] = useState<string | null>(null)

  const images = useMemo(() => product.images ?? [], [product.images])
  const remainingSlots = Math.max(0, maxProductImages - images.length - pendingFiles.length)
  const hasPendingFiles = pendingFiles.length > 0

  useEffect(() => {
    setDraftAltText((current) => {
      const next: Record<string, string> = {}
      images.forEach((image) => {
        next[image.id] = current[image.id] ?? image.altText
      })
      return next
    })
  }, [images])

  useEffect(() => {
    pendingFilesRef.current = pendingFiles
  }, [pendingFiles])

  useEffect(
    () => () => {
      pendingFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    },
    [],
  )

  const orderedImages = useMemo(
    () =>
      [...images].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder
        }
        return a.createdAt.localeCompare(b.createdAt)
      }),
    [images],
  )

  function chooseFiles(files: File[]) {
    setError(null)
    setNotice(null)
    const validation = validateFiles(files, remainingSlots)
    if (validation.error) {
      setError(validation.error)
    }
    if (validation.files.length === 0) {
      return
    }

    const nextFiles = validation.files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPendingFiles((current) => [...current, ...nextFiles])
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    chooseFiles(Array.from(event.dataTransfer.files ?? []))
  }

  function removePendingFile(index: number) {
    setPendingFiles((current) => {
      const next = [...current]
      const [removed] = next.splice(index, 1)
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return next
    })
  }

  async function handleUpload() {
    if (pendingFiles.length === 0) {
      return
    }

    setIsUploading(true)
    setError(null)
    setNotice(null)
    try {
      const nextImages = await uploadProductImages(
        product.id,
        pendingFiles.map((item) => item.file),
      )
      pendingFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      setPendingFiles([])
      onImagesChange(nextImages)
      setNotice('Images uploaded.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSetPrimary(image: ProductImage) {
    if (image.isPrimary) {
      return
    }

    setBusyImageId(image.id)
    setError(null)
    setNotice(null)
    try {
      const updated = await updateProductImage(product.id, image.id, { isPrimary: true })
      const nextImages = images.map((item) => ({
        ...item,
        isPrimary: item.id === updated.id,
        altText: item.id === updated.id ? updated.altText : item.altText,
      }))
      onImagesChange(nextImages)
      setNotice('Primary image updated.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyImageId(null)
    }
  }

  async function handleSaveAltText(image: ProductImage) {
    const altText = (draftAltText[image.id] ?? '').trim()
    setBusyImageId(image.id)
    setError(null)
    setNotice(null)
    try {
      const updated = await updateProductImage(product.id, image.id, { altText })
      onImagesChange(images.map((item) => (item.id === updated.id ? updated : item)))
      setNotice('Alt text saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyImageId(null)
    }
  }

  async function handleMove(image: ProductImage, direction: -1 | 1) {
    const index = orderedImages.findIndex((item) => item.id === image.id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= orderedImages.length) {
      return
    }

    const nextOrder = orderedImages.map((item) => item.id)
    const [imageId] = nextOrder.splice(index, 1)
    nextOrder.splice(targetIndex, 0, imageId)

    setBusyImageId(image.id)
    setError(null)
    setNotice(null)
    try {
      const nextImages = await reorderProductImages(product.id, nextOrder)
      onImagesChange(nextImages)
      setNotice('Image order updated.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyImageId(null)
    }
  }

  async function handleDelete(image: ProductImage) {
    if (!window.confirm('Delete this image?')) {
      return
    }

    setBusyImageId(image.id)
    setError(null)
    setNotice(null)
    try {
      await deleteProductImage(product.id, image.id)
      const nextImages = images.filter((item) => item.id !== image.id)
      const hasPrimary = nextImages.some((item) => item.isPrimary)
      if (!hasPrimary && nextImages[0]) {
        nextImages[0] = { ...nextImages[0], isPrimary: true }
      }
      onImagesChange(nextImages)
      setNotice('Image deleted.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyImageId(null)
    }
  }

  return (
    <section className="space-y-4 border-t border-stone-200 pt-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-950">Product images</h3>
          <p className="mt-1 text-sm text-slate-600">
            {images.length} of {maxProductImages} images
            {primaryImageUrl(images) ? ' · primary selected' : ''}
          </p>
        </div>
        <Button
          disabled={remainingSlots <= 0 || isUploading}
          leftIcon={<ImagePlus aria-hidden="true" size={17} />}
          onClick={() => inputRef.current?.click()}
          type="button"
          variant="secondary"
        >
          Select images
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}

      <input
        accept="image/jpeg,image/png"
        className="hidden"
        multiple
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />
      <div
        className={cn(
          'flex min-h-28 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center transition',
          isDragging && 'border-emerald-600 bg-emerald-50',
          remainingSlots <= 0 && 'opacity-60',
        )}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDrop={handleDrop}
      >
        <div className="space-y-2">
          <Upload aria-hidden="true" className="mx-auto text-slate-500" size={24} />
          <p className="text-sm font-semibold text-slate-700">
            Drop JPG or PNG files here
          </p>
          <p className="text-xs text-slate-500">Max 4 MiB per image</p>
        </div>
      </div>

      {hasPendingFiles ? (
        <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {pendingFiles.length} ready to upload
            </p>
            <Button
              disabled={isUploading}
              leftIcon={<Upload aria-hidden="true" size={16} />}
              onClick={() => void handleUpload()}
              size="sm"
              type="button"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pendingFiles.map((item, index) => (
              <div
                className="relative overflow-hidden rounded-lg border border-stone-200 bg-white"
                key={`${item.file.name}-${item.previewUrl}`}
              >
                <img
                  alt=""
                  className="aspect-square w-full object-contain p-2"
                  src={item.previewUrl}
                />
                <button
                  aria-label={`Remove ${item.file.name}`}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-slate-700 shadow-sm hover:text-red-700"
                  disabled={isUploading}
                  onClick={() => removePendingFile(index)}
                  type="button"
                >
                  <X aria-hidden="true" size={15} />
                </button>
                <p className="truncate border-t border-stone-200 px-2 py-2 text-xs font-semibold text-slate-600">
                  {item.file.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {orderedImages.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {orderedImages.map((image, index) => {
            const isBusy = busyImageId === image.id
            const draft = draftAltText[image.id] ?? image.altText
            return (
              <article
                className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-[7rem_minmax(0,1fr)]"
                key={image.id}
              >
                <div className="relative flex aspect-square items-center justify-center rounded-lg bg-stone-50 p-2">
                  <img
                    alt={image.altText || product.name}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.src = fallbackProductImageUrl
                    }}
                    src={image.url || fallbackProductImageUrl}
                  />
                  {image.isPrimary ? (
                    <Badge className="absolute left-2 top-2" variant="success">
                      Primary
                    </Badge>
                  ) : null}
                </div>
                <div className="min-w-0 space-y-3">
                  <input
                    aria-label="Image alt text"
                    className={fieldClass}
                    onChange={(event) =>
                      setDraftAltText((current) => ({
                        ...current,
                        [image.id]: event.target.value,
                      }))
                    }
                    placeholder={product.name}
                    value={draft}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={isBusy || draft.trim() === image.altText}
                      onClick={() => void handleSaveAltText(image)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Save alt
                    </Button>
                    <Button
                      disabled={isBusy || image.isPrimary}
                      leftIcon={<Star aria-hidden="true" size={15} />}
                      onClick={() => void handleSetPrimary(image)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Primary
                    </Button>
                    <Button
                      disabled={isBusy || index === 0}
                      leftIcon={<ArrowUp aria-hidden="true" size={15} />}
                      onClick={() => void handleMove(image, -1)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Up
                    </Button>
                    <Button
                      disabled={isBusy || index === orderedImages.length - 1}
                      leftIcon={<ArrowDown aria-hidden="true" size={15} />}
                      onClick={() => void handleMove(image, 1)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Down
                    </Button>
                    <Button
                      disabled={isBusy}
                      leftIcon={<Trash2 aria-hidden="true" size={15} />}
                      onClick={() => void handleDelete(image)}
                      size="sm"
                      type="button"
                      variant="danger"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
