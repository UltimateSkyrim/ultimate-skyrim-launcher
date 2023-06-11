import { GraphicsController } from "@/main/controllers/graphics/graphics.controller";
import { GraphicsService } from "@/main/services/graphics.service";
import {
  createStubInstance,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";

describe("Graphics controller", () => {
  let graphicsService: StubbedInstanceWithSinonAccessor<GraphicsService>;
  let graphicsController: GraphicsController;

  beforeEach(() => {
    graphicsService = createStubInstance(GraphicsService);
    graphicsController = new GraphicsController(graphicsService);
  });

  it("should get graphics preferences", () => {
    graphicsController.getGraphicsPreference();
    sinon.assert.called(graphicsService.stubs.getGraphicsPreference);
  });

  it("should get the graphics settings", async () => {
    await graphicsController.getGraphics();
    sinon.assert.called(graphicsService.stubs.getGraphics);
  });

  it("should set the graphics preference", async () => {
    await graphicsController.setGraphics("mock graphics");
    sinon.assert.calledWith(graphicsService.stubs.setGraphics, "mock graphics");
  });

  it("should restore the graphics preference", async () => {
    await graphicsController.restoreGraphics();
    sinon.assert.called(graphicsService.stubs.restoreGraphics);
  });
});
