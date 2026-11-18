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
      <div class="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-10">
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

    <div class="mx-auto w-full max-w-[1600px] flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
      <!-- The viewer is sticky so the bike stays visible while options scroll beneath it. -->
      <main class="min-w-0 pb-36 [--viewer-h:max(34vh,220px)] sm:[--viewer-h:max(42vh,300px)] lg:pb-16 lg:[--viewer-h:clamp(380px,54vh,600px)]">
        <!-- 3D viewer -->
        <section
          class="sticky top-16 z-20 h-[var(--viewer-h)] overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#FFFFFF_0%,#F4F2EE_55%,#E9E6E0_100%)]"
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

          <div class="pointer-events-none absolute bottom-4 left-4 sm:bottom-6 sm:left-6 lg:left-10">
            <p class="hidden text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-graphite-400 sm:block">ForgeLab</p>
            <p class="font-display text-xl font-semibold tracking-tightest sm:text-4xl">{{ frameName }}</p>
            <p class="flex items-center gap-2 text-sm text-graphite">
              <PaintSwatch v-if="paint" :color="paint.color" :finish="paint.finish" size="sm" />
              {{ paintLabel }}
            </p>
          </div>
        </section>

        <!-- Step navigation -->
        <div class="sticky top-[calc(4rem+var(--viewer-h))] z-30 border-b border-bone-300/80 bg-bone/90 px-3 py-2.5 backdrop-blur-md sm:px-5 lg:px-9">
          <StepNav />
        </div>

        <!-- Step content -->
        <section class="px-4 pt-8 sm:px-6 lg:px-10 lg:pt-10">
          <Transition name="step" mode="out-in">
            <div :key="currentStep.id">
              <p class="tabular text-xs font-semibold uppercase tracking-[0.14em] text-forge">
                Step {{ stepIndex + 1 }} of {{ steps.length }}
              </p>
              <h1 class="mt-2 font-display text-3xl font-semibold tracking-tightest sm:text-4xl">{{ currentStep.title }}</h1>
              <p class="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-graphite">{{ currentStep.description }}</p>

              <CompatibilityNotice v-if="!isReview" :groups="currentStep.groups" class="mt-6" />

              <div class="mt-8">
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

          <!-- Mobile build summary -->
          <details class="group mt-10 rounded-2xl border border-bone-300 bg-white p-5 lg:hidden">
            <summary class="flex cursor-pointer list-none items-center justify-between font-medium">
              Build summary
              <span class="text-graphite transition-transform duration-300 group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div class="mt-4"><BuildSummary /></div>
          </details>

          <p class="mt-12 max-w-2xl text-xs leading-relaxed text-graphite-400">
            ForgeLab is a fictional brand built as a technology demonstration. Component names, specifications and
            prices are illustrative. Third-party brand names are used for demonstration only and imply no affiliation
            or product compatibility.
          </p>
        </section>
      </main>

      <!-- Desktop right-side summary -->
      <aside class="hidden border-l border-bone-300 bg-bone-200/40 lg:block">
        <div class="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col gap-6 overflow-y-auto p-8">
          <BuildSummary />
          <div class="mt-auto"><StepFooter /></div>
        </div>
      </aside>
    </div>

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
