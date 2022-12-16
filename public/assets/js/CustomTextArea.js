class CustomTextarea {
    constructor(element) {
        this.element = element;
        this.textarea = this.element.querySelector('.textarea');
        this.numbers = this.element.querySelector('.linenumbers');

        this.numberOfNumbers = 1;

        this.addMoreNumbers();
        this.initEventListeners();
    }

    addMoreNumbers() {
        let html = '';

        for (let i = this.numberOfNumbers; i < this.numberOfNumbers + 100; i++) {
            html += `<div class='number'>${i}</div>`;
        }

        this.numberOfNumbers += 100;
        this.numbers.innerHTML += html;
    }

    initEventListeners() {
        this.textarea.addEventListener('scroll', () => {
            this.numbers.style.transform = `translateY(-${this.textarea.scrollTop}px)`;

            if (Math.abs(
                this.numbers.offsetHeight
                - this.textarea.offsetHeight
                - this.textarea.scrollTop) < 100) {
                this.addMoreNumbers();
            }
        });
    }
};

const textarea = new CustomTextarea(document.querySelector('.custom-textarea'));