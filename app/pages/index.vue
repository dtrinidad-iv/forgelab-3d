<script setup lang="ts">
import { GROUP_IDS } from '~/config/catalog'
import type { VisualTarget } from '~/utils/three/configuratorScene'

const { getOption, paint, selections } = useConfigurator()
const { set: setVisualStatus } = useVisualStatus()
const { steps, stepIndex, currentStep } = useConfiguratorSteps()
const { total } = usePricing()

const frameName = computed(() => getOption('frame')?.name ?? 'Your ForgeLab')
const paintLabel = computed(() => {
  const option = getOption('paint')
  if (!option) return ''
  return option.paint?.custom && paint.value ? `Custom · ${paint.value.color}` : option.name
})
/** What the 3D viewer should show — paint + every group's selection. */
const visualTarget = computed<VisualTarget>(() => ({
  paint: paint.value,
  variants: Object.fromEntries(GROUP_IDS.filter((g) => g !== 'paint').map((g) => [g, selections.value[g]])),
}))

// New step → bring its title back into view under the sticky viewer.
watch(
  () => currentStep.value.id,
  () => import.meta.client && window.scrollY > 0 && window.scrollTo({ top: 0, behavior: 'smooth' }),
)

/** Mobile/tablet: shrink the sticky bike once the customer scrolls into the options (hysteresis avoids flicker). */
const compact = ref(false)
function onScroll() {
  const y = window.scrollY
  if (!compact.value && y > 120) compact.value = true
  else if (compact.value && y < 8) compact.value = false
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const isReview = computed(() => currentStep.value.id === 'review')
const multiGroup = computed(() => currentStep.value.groups.length > 1)

useSeoMeta({
  title: () => `${currentStep.value.label} · ForgeLab Configurator`,
})
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-40 border-b border-bone-300/80 bg-bone/85 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-[1800px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <ForgeLabLogo />
        <p class="hidden text-sm text-graphite md:block">
          Road Configurator <span class="mx-2 text-bone-300">/</span>
          <span class="text-ink">{{ frameName }}</span>
        </p>
        <div class="flex items-center gap-3">
          <span class="hidden text-xs uppercase tracking-[0.12em] text-graphite-400 sm:inline">Total</span>
          <PriceDisplay :value="total" />
        </div>
      </div>
    </header>

    <!--
      Desktop: bike fills the left (sticky, full height); the configuration gets the whole right column.
      Mobile/tablet: bike is sticky on top and shrinks once you scroll into the options.
    -->
    <div
      class="mx-auto w-full max-w-[1800px] flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[minmax(0,1fr)_540px]"
      :class="compact ? '[--viewer-h:max(24vh,170px)] sm:[--viewer-h:max(28vh,220px)]' : '[--viewer-h:max(36vh,230px)] sm:[--viewer-h:max(44vh,320px)]'"
    >
      <!-- 3D viewer -->
      <section
        class="sticky top-16 z-20 h-[var(--viewer-h)] overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#FFFFFF_0%,#F4F2EE_55%,#E9E6E0_100%)] transition-[height] duration-300 ease-premium lg:h-[calc(100dvh-4rem)] lg:transition-none"
        aria-label="3D bicycle preview"
      >
        <ClientOnly>
          <ProductViewer class="absolute inset-0" :target="visualTarget" @visual-status="setVisualStatus" />
          <template #fallback>
            <div class="absolute inset-0 grid place-items-center">
              <span class="h-8 w-8 animate-spin rounded-full border-2 border-bone-300 border-t-ink" />
            </div>
          </template>
        </ClientOnly>

        <div class="pointer-events-none absolute bottom-4 left-4 sm:bottom-6 sm:left-6 lg:bottom-8 lg:left-10">
          <p class="hidden text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-graphite-400 sm:block">ForgeLab</p>
          <p class="font-display font-semibold tracking-tightest transition-all duration-300" :class="compact ? 'text-lg sm:text-2xl lg:text-5xl' : 'text-xl sm:text-4xl lg:text-5xl'">
            {{ frameName }}
          </p>
          <p class="items-center gap-2 text-sm text-graphite" :class="compact ? 'hidden lg:flex' : 'flex'">
            <PaintSwatch v-if="paint" :color="paint.color" :finish="paint.finish" size="sm" />
            {{ paintLabel }}
          </p>
        </div>
      </section>

      <!-- Configuration column -->
      <main class="flex min-w-0 flex-col lg:border-l lg:border-bone-300">
        <!-- Step navigation -->
        <div
          class="sticky top-[calc(4rem+var(--viewer-h))] z-30 border-b border-bone-300/80 bg-bone/95 px-3 pb-2 pt-2.5 backdrop-blur-md transition-[top] duration-300 ease-premium sm:px-5 lg:top-16 lg:px-6 lg:pb-3 lg:pt-4 lg:transition-none"
        >
          <StepNav />
        </div>

        <!-- Step content -->
        <section class="flex-1 px-4 pb-40 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <Transition name="step" mode="out-in">
            <div :key="currentStep.id">
              <p class="tabular text-xs font-semibold uppercase tracking-[0.14em] text-forge">
                Step {{ stepIndex + 1 }} of {{ steps.length }}
              </p>
              <h1 class="mt-2 font-display text-3xl font-semibold tracking-tightest sm:text-4xl lg:text-[2.1rem]">{{ currentStep.title }}</h1>
              <p class="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-graphite">{{ currentStep.description }}</p>

              <CompatibilityNotice v-if="!isReview" :groups="currentStep.groups" class="mt-6" />

              <div class="mt-7">
                <ReviewPanel v-if="isReview" />
                <div v-else :class="multiGroup ? 'rounded-2xl border border-bone-300 bg-bone px-4 lg:border-0 lg:bg-transparent lg:px-0' : ''">
                  <OptionGroup
                    v-for="(group, i) in currentStep.groups"
                    :key="group"
                    :group="group"
                    :collapsible="multiGroup"
                    :default-open="i === 0"
                  />
                </div>
              </div>
            </div>
          </Transition>

          <!-- Build summary (collapsible on every screen; total is always in the footer) -->
          <details class="group mt-10 rounded-2xl border border-bone-300 bg-white p-5">
            <summary class="flex cursor-pointer list-none items-center justify-between font-medium">
              <span>Your build <span class="ml-1 text-sm font-normal text-graphite">· every component and price</span></span>
              <span class="text-graphite transition-transform duration-300 group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div class="mt-4"><BuildSummary /></div>
          </details>

          <p class="mt-10 max-w-2xl text-xs leading-relaxed text-graphite-400">
            ForgeLab is a fictional brand built as a technology demonstration. Component names, specifications and
            prices are illustrative. Third-party brand names are used for demonstration only and imply no affiliation
            or product compatibility.
          </p>
        </section>

        <!-- Desktop footer: total + navigation always visible -->
        <div class="sticky bottom-0 z-30 hidden border-t border-bone-300 bg-bone/95 px-8 py-4 backdrop-blur-md lg:block">
          <StepFooter />
        </div>
      </main>
    </div>

    <CartDialog />

    <!-- Mobile bottom bar -->
    <div class="fixed inset-x-0 bottom-0 z-40 border-t border-bone-300 bg-bone/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
      <StepFooter />
    </div>
  </div>
</template>

<style scoped>
.step-enter-active,
.step-leave-active {
  transition:
    opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.step-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.step-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
