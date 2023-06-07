import type { EventService } from "@/renderer/services/service-container";
import type { VueFinalModalProperty } from "vue-final-modal";

export const modalOpenedEvent = "modalOpened";

export class ModalService {
  // maintain a list of modals that have tried to open to prevent more than one being open at once
  private modalQueue: string[] = [];

  constructor(private eventService: EventService) {}

  public openModal(name: string, vfm: VueFinalModalProperty) {
    if (this.modalQueue.length === 0) {
      // Currently no other modals waiting to be opened so just open the modal
      vfm.show(name);
      // Add to the modal queue until the modal is closed
      this.modalQueue.push(name);
      this.eventService.emit(modalOpenedEvent, true);
    } else {
      // There are currently modals open so just add to the queue
      this.modalQueue.push(name);
    }
  }

  public closeModal(name: string, vfm: VueFinalModalProperty) {
    vfm.hide(name);
    this.modalQueue = this.modalQueue.filter((modal) => modal !== name);
    this.eventService.emit(modalOpenedEvent, false);
    if (this.modalQueue[0]) {
      // There are still modals waiting to be opened, open the next one
      vfm.show(this.modalQueue[0]);
      this.eventService.emit(modalOpenedEvent, true);
    }
  }
}
