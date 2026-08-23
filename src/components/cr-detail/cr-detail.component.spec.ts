import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	// DIFF TOTALS & DELTA TEST
	it('renders totals, delta, and the correct diff kind per row', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const totals = fixture.nativeElement.querySelector('.cr-detail__totals').textContent;
		expect(totals).toContain('USD 8,000.00');
		expect(totals).toContain('USD 8,500.00');
		expect(totals).toContain('USD 500.00');

		const changedRow: HTMLElement = fixture.nativeElement.querySelector('.cr-diff__row[data-kind="changed"]');
		expect(changedRow.textContent).toContain('SKU-A');
	});

	// TIMELINE TEST
	it('renders the approval timeline oldest-first', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const entries: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.cr-timeline__entry .cr-timeline__action');
		const order = Array.from(entries).map((e) => e.textContent?.trim());
		expect(order).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
	});
});
