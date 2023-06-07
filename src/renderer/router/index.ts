import {
  createRouter,
  createWebHashHistory,
  NavigationGuardWithThis,
  RouteLocationNormalized,
  RouteRecordRaw,
} from "vue-router";

import ViewHome from "@/renderer/views/ViewHome.vue";
import ViewCommunity from "@/renderer/views/ViewCommunity.vue";
import ViewAdvanced from "@/renderer/views/ViewAdvanced.vue";
import AutoUpdate from "@/renderer/views/AutoUpdate.vue";
import ModDirectoryView from "@/renderer/views/ModDirectory.vue";
import type { ModpackService } from "@/renderer/services/modpack.service";

const HomeRouteName = "Home";
const AutoUpdateRouteName = "AutoUpdate";
const ModDirectoryRouteName = "ModDirectory";

const checkModDirectory =
  (modpackService: ModpackService): NavigationGuardWithThis<undefined> =>
  async () => {
    if (
      !(await modpackService.isModDirectorySet()) ||
      !(await modpackService.isCurrentModpackValid())
    ) {
      await modpackService.deleteModpackDirectory();
      return {
        name: ModDirectoryRouteName,
      };
    }

    return undefined;
  };

const getRoutes = (modpackService: ModpackService): RouteRecordRaw[] =>
  [
    {
      path: "/",
      name: HomeRouteName,
      component: ViewHome,
      beforeEnter: [checkModDirectory(modpackService)],
    },
    {
      path: "/community",
      name: "Community",
      component: ViewCommunity,
      beforeEnter: [checkModDirectory(modpackService)],
    },
    {
      path: "/advanced",
      name: "Advanced",
      component: ViewAdvanced,
      beforeEnter: [checkModDirectory(modpackService)],
    },
    {
      path: "/auto-update",
      name: AutoUpdateRouteName,
      component: AutoUpdate,
      meta: {
        preload: true,
      },
    },
    {
      path: "/mod-directory",
      name: ModDirectoryRouteName,
      component: ModDirectoryView,
      props: true,
      meta: {
        preload: true,
      },
      beforeEnter: async (to: RouteLocationNormalized) => {
        if (
          (await modpackService.isModDirectorySet()) &&
          to.name === ModDirectoryRouteName
        ) {
          // If the page is refreshed on the mod directory selection, just redirect to the home page
          return { name: HomeRouteName };
        }
        return undefined;
      },
    },
  ]
    // If preload metadata is not set, set it to false
    .map((route) => {
      return {
        ...route,
        meta: { ...route.meta, preload: route.meta?.preload ?? false },
      };
    });

export const getRouter = (modpackService: ModpackService) =>
  createRouter({
    history: createWebHashHistory(),
    routes: getRoutes(modpackService),
  });
