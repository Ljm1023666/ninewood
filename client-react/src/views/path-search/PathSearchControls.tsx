import { MsIcon } from '@/components/ui/ms-icon'
import {
  INTENT_MATCH_OPTIONS,
  PATH_MATCH_OPTIONS,
  PATH_SORT_OPTIONS,
  PRICE_FACET_OPTIONS,
  REGION_FACET_OPTIONS,
  SERVICE_TYPE_FACET_OPTIONS,
  facetType,
  formatPathDisplay,
  replaceFacetOfType,
  type IntentMatchMode,
  type PathMatchMode,
  type PathSortMode,
} from '@/constants/path-search'

type Props = {
  match: PathMatchMode
  minHit: number
  intentMatch: IntentMatchMode
  sort: PathSortMode
  pathCount: number
  hasQuery: boolean
  facets: string[]
  onMatchChange: (match: PathMatchMode) => void
  onMinHitChange: (minHit: number) => void
  onIntentMatchChange: (intentMatch: IntentMatchMode) => void
  onSortChange: (sort: PathSortMode) => void
  onFacetsChange: (facets: string[]) => void
  onCollapse?: () => void
}

function pickFacet(facets: string[], type: 'attr' | 'bkt' | 'rgn'): string | null {
  return facets.find((f) => facetType(f) === type) ?? null
}

export function PathSearchControls({
  match,
  minHit,
  intentMatch,
  sort,
  pathCount,
  hasQuery,
  facets,
  onMatchChange,
  onMinHitChange,
  onIntentMatchChange,
  onSortChange,
  onFacetsChange,
  onCollapse,
}: Props) {
  const serviceFacet = pickFacet(facets, 'attr')
  const priceFacet = pickFacet(facets, 'bkt')
  const regionFacet = pickFacet(facets, 'rgn')

  return (
    <div className="psa-controls">
      <div className="psa-controls__head">
        <MsIcon name="tune" size={16} className="psa-controls__headicon" />
        <span>筛选与排序</span>
        {onCollapse ? (
          <button
            type="button"
            className="psa-controls__collapse"
            onClick={onCollapse}
            aria-label="收纳筛选与排序"
            title="收纳到右侧边缘"
          >
            <MsIcon name="chevron_right" size={18} />
          </button>
        ) : null}
      </div>

      <div className="psa-controls__row">
        <span className="psa-controls__label psa-mono">筛选条件</span>
        <div className="psa-controls__facetnote psa-mono">硬过滤 · 不参与命中计分</div>
        <div className="psa-controls__subrow">
          <span className="psa-controls__sublabel">服务方式</span>
          <div className="psa-seg" role="group" aria-label="服务方式">
            {SERVICE_TYPE_FACET_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`psa-seg__btn${serviceFacet === opt.value ? ' psa-seg__btn--on' : ''}`}
                onClick={() => onFacetsChange(replaceFacetOfType(facets, 'attr', opt.value))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <label className="psa-sortsel psa-mono psa-controls__pricesel">
          <MsIcon name="payments" size={14} />
          <select
            value={priceFacet ?? ''}
            onChange={(e) => {
              const v = e.target.value || null
              onFacetsChange(replaceFacetOfType(facets, 'bkt', v))
            }}
            aria-label="价格档"
          >
            {PRICE_FACET_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? ''}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="psa-sortsel psa-mono psa-controls__pricesel">
          <MsIcon name="location_on" size={14} />
          <select
            value={regionFacet ?? ''}
            onChange={(e) => {
              const v = e.target.value || null
              onFacetsChange(replaceFacetOfType(facets, 'rgn', v))
            }}
            aria-label="地区"
          >
            {REGION_FACET_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? ''}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {facets.length > 0 ? (
          <ul className="psa-facetlist">
            {facets.map((f) => (
              <li key={f} className="psa-facetlist__item">
                <MsIcon name="lock" size={12} className="psa-facetlist__lock" />
                <span>{formatPathDisplay(f)}</span>
                <button
                  type="button"
                  className="psa-facetlist__x"
                  onClick={() => onFacetsChange(facets.filter((x) => x !== f))}
                  aria-label={`移除筛选 ${f}`}
                >
                  <MsIcon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="psa-controls__row">
        <span className="psa-controls__label psa-mono">命中要求</span>
        <div className="psa-seg" role="group" aria-label="命中要求">
          {PATH_MATCH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`psa-seg__btn${match === opt.value ? ' psa-seg__btn--on' : ''}`}
              onClick={() => onMatchChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {match === 'custom' ? (
          <div className="psa-stepper psa-mono" aria-label="最少命中条数">
            <button
              type="button"
              className="psa-stepper__btn"
              disabled={minHit <= 1}
              onClick={() => onMinHitChange(minHit - 1)}
              aria-label="减少"
            >
              <MsIcon name="remove" size={14} />
            </button>
            <span className="psa-stepper__val">≥{minHit}</span>
            <button
              type="button"
              className="psa-stepper__btn"
              disabled={minHit >= pathCount}
              onClick={() => onMinHitChange(minHit + 1)}
              aria-label="增加"
            >
              <MsIcon name="add" size={14} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="psa-controls__row">
        <span className="psa-controls__label psa-mono">意图要求</span>
        <div
          className={`psa-seg${!hasQuery ? ' psa-seg--disabled' : ''}`}
          role="group"
          aria-label="意图要求"
          title={!hasQuery ? '需要检索词 q 才能使用意图过滤' : undefined}
        >
          {INTENT_MATCH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`psa-seg__btn${intentMatch === opt.value ? ' psa-seg__btn--on' : ''}`}
              disabled={!hasQuery && opt.value !== 'off'}
              onClick={() => onIntentMatchChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="psa-controls__row">
        <span className="psa-controls__label psa-mono">排序</span>
        <label className="psa-sortsel psa-mono">
          <MsIcon name="sort" size={14} />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as PathSortMode)}
            aria-label="排序方式"
          >
            {PATH_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
