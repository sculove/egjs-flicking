/**
 * Copyright (c) 2015 NAVER Corp.
 * egjs projects are licensed under the MIT license
 */
import * as consts from "./consts";

export default superclass => class extends superclass {
	/**
	 * 'hold' event handler
	 */
	_holdHandler(e) {
		const conf = this._conf;
		const holdPos = e.pos.flick;

		conf.touch.holdPos = holdPos;
		conf.touch.holding = true;
		conf.panel.changed = false;

		this._adjustContainerCss("start", holdPos);
	}

	/**
	 * 'change' event handler
	 */
	_changeHandler(e) {
		const conf = this._conf;
		const touch = conf.touch;
		const pos = e.pos.flick;
		const holdPos = touch.holdPos;
		let direction;
		let eventRes = null;
		let movedPx;

		this._setPointerEvents(e);  // for "click" bug

		/**
		 * This event is fired when panel moves.
		 * @ko 패널이 이동할 때 발생하는 이벤트
		 * @name eg.Flicking#flick
		 * @event
		 * @param {Object} param The object of data to be sent to an event <ko>이벤트에 전달되는 데이터 객체</ko>
		 * @param {String} param.eventType The name of the event<ko>이름명</ko>
		 * @param {Number} param.index Physical index number of the current panel element, which is relative to DOM (@deprecated since 1.3.0)<ko>현재 패널 엘리먼트의 물리적 인덱스 번호. DOM 엘리먼트를 기준으로 하는 인덱스 번호다 (@deprecated since 1.3.0)</ko>
		 * @param {Number} param.no Logical index number of the current panel element, which is relative to the panel content <ko>현재 패널 엘리먼트의 논리적 인덱스 번호. 패널 콘텐츠를 기준으로 하는 인덱스 번호다</ko>
		 * @param {Number} param.direction Direction of the movement (see eg.Axes.DIRECTION_* constant) <ko>이동 방향(eg.Axes.DIRECTION_* constant 참고)</ko>
		 * @param {Number} param.pos current coordinate <ko>현재 좌표</ko>
		 * @param {Boolean} param.holding Indicates whether a user holds an element on the screen of the device. <ko>사용자가 기기의 화면을 누르고 있는지 여부</ko>
		 * @param {Number} param.distance Distance moved from then starting point. According the move direction, positive on eg.Axes.DIRECTION_LEFT/UP and negative on eg.Axes.DIRECTION_RIGHT/DOWN <ko>시작점부터 이동된 거리의 값. 이동 방향에 따라 eg.Axes.DIRECTION_LEFT/UP의 경우 양수를 eg.Axes.DIRECTION_RIGHT/DOWN의 경우는 음수를 반환</ko>
		 */
		if (e.inputEvent) {
			direction = e.inputEvent.direction;

			// Adjust direction in case of diagonal touch move
			movedPx = e.inputEvent[this.options.horizontal ? "deltaX" : "deltaY"];

			if (!~conf.dirData.indexOf(direction)) {
				direction = conf.dirData[+(Math.abs(touch.lastPos) <= movedPx)];
			}

			touch.lastPos = movedPx;
		} else {
			touch.lastPos = null;
		}

		conf.customEvent.flick && (eventRes =
			this._triggerEvent(consts.EVENTS.flick, {
				pos,
				holding: e.holding,
				direction: direction || touch.direction,
				distance: pos - holdPos
			})
		);

		(eventRes || eventRes === null) && this._setTranslate([-pos, 0]);
	}

	/**
	 * 'release' event handler
	 */
	_releaseHandler(e) {
		const conf = this._conf;
		const touch = conf.touch;
		const holdPos = touch.holdPos;
		const panelSize = conf.panel.size;
		const customEvent = conf.customEvent;
		const isPlusMove = touch.holdPos < e.depaPos.flick;

		touch.distance = e.depaPos.flick - holdPos;
		touch.direction = conf.dirData[+!(isPlusMove)];
		touch.destPos = holdPos + (isPlusMove ? panelSize : -panelSize);

		const distance = touch.distance;
		let duration = this.options.duration;
		let moveTo = holdPos;

		if (this._isMovable()) {
			!customEvent.restoreCall && (customEvent.restore = false);
			moveTo = touch.destPos;
		} else if (Math.abs(distance) > 0) {
			this._triggerBeforeRestore(e);
		} else {
			duration = 0;
		}

		// trigger animation
		e.setTo({flick: moveTo}, duration);

		distance === 0 && this._adjustContainerCss("end");
		touch.holding = false;

		this._setPointerEvents();  // for "click" bug
	}

	/**
	 * 'animationStart' event handler
	 */
	_animationStartHandler(e) {
		const conf = this._conf;
		const panel = conf.panel;
		const customEvent = conf.customEvent;
		const isFromInput = e.inputEvent || conf.touch.lastPos;

		// when animation was started by input action
		if (!customEvent.restoreCall && isFromInput &&
			this._setPhaseValue("start", {
				depaPos: e.depaPos.flick,
				destPos: e.destPos.flick
			}) === false) {
			e.stop();
		}

		if (isFromInput) {
			e.duration = this.options.duration;

			e.destPos.flick =
				panel.size * (
					panel.index + conf.indexToMove
				);
		}

		panel.animating = true;
	}

	/**
	 * 'animationEnd' event handler
	 */
	_animationEndHandler() {
		this._conf.panel.animating = false;

		this._setPhaseValue("end");
		this._triggerRestore();
	}
};
